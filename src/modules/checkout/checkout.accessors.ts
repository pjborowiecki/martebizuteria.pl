import { eq, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { address } from "~/src/modules/address/address.schema";
import { checkout } from "~/src/modules/checkout/checkout.schema";
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod";
import { inventory } from "~/src/modules/inventory/inventory.schema";
import { orderItem } from "~/src/modules/order-item/order-item.schema";
import { order } from "~/src/modules/order/order.schema";
import { payment } from "~/src/modules/payment/payment.schema";

const EMPTY_ITEMS = 0;

interface PendingCheckout {
  checkoutId: string;
  email: string;
  paymentId: string;
  userId: string | null;
}

/** A purchased line, resolved from the payment provider, ready to fulfil. */
interface FulfillmentLine {
  price: number;
  qty: number;
  title: string;
  variantId: string;
}

/** A line whose reservation must be returned to stock. */
interface ReleaseLine {
  qty: number;
  variantId: string;
}

interface FulfillCheckoutInput {
  amount: number;
  currency: string;
  lines: FulfillmentLine[];
  transactionId: string;
}

interface ReleaseCheckoutInput {
  lines: ReleaseLine[];
  transactionId: string;
}

async function createCheckoutAndAddress(checkoutValues: CheckoutFormSchema, userId: string | undefined, userEmail: string) {
  const checkoutId = crypto.randomUUID();
  const shippingAddressId = crypto.randomUUID();
  const billingAddressId = checkoutValues.sameAsShipping === true ? shippingAddressId : crypto.randomUUID();

  const shippingInsert = db.insert(address).values({
    address1: checkoutValues.address1,
    address2: checkoutValues.address2,
    city: checkoutValues.city,
    countryCode: checkoutValues.countryCode,
    firstName: checkoutValues.firstName ?? "",
    id: shippingAddressId,
    isDefault: checkoutValues.saveShippingAddress,
    lastName: checkoutValues.lastName ?? "",
    phone: checkoutValues.phone,
    postalCode: checkoutValues.postalCode,
    province: checkoutValues.province,
    userId
  });

  const checkoutInsert = db.insert(checkout).values({
    billingAddressId,
    email: userEmail,
    id: checkoutId,
    shippingAddressId,
    status: "pending",
    userId
  });

  const billingInsert =
    checkoutValues.sameAsShipping === true
      ? undefined
      : db.insert(address).values({
          address1: checkoutValues.billingAddress1 ?? "",
          city: checkoutValues.billingCity ?? "",
          countryCode: checkoutValues.billingCountryCode ?? "",
          firstName: checkoutValues.billingFirstName ?? "",
          id: billingAddressId,
          isDefault: checkoutValues.saveBillingAddress,
          lastName: checkoutValues.billingLastName ?? "",
          phone: checkoutValues.phone,
          postalCode: checkoutValues.billingPostalCode ?? "",
          userId
        });

  // Cloudflare D1 rejects SQL `BEGIN TRANSACTION`/`SAVEPOINT` (which Drizzle's
  // interactive `db.transaction()` emits), so atomic multi-statement writes must
  // go through the D1 batch API instead. Addresses are listed before the
  // checkout row so its FK references resolve within the batch.
  await (billingInsert === undefined
    ? db.batch([shippingInsert, checkoutInsert])
    : db.batch([shippingInsert, billingInsert, checkoutInsert]));

  return checkoutId;
}

/**
 * Finds the still-pending checkout behind a payment transaction (Stripe Checkout
 * Session id). Returns `undefined` when no live payment matches (e.g. a session
 * that was superseded and repointed) or the checkout was already settled, which
 * is what makes the webhook handlers idempotent against retries and duplicates.
 */
async function findPendingCheckoutByTransaction(transactionId: string): Promise<PendingCheckout | undefined> {
  const paymentRow = await db.query.payment.findFirst({
    columns: { checkoutId: true, id: true },
    where: eq(payment.transactionId, transactionId)
  });

  if (paymentRow === undefined) {
    console.info(`No live payment for transaction ${transactionId}; ignoring.`);
    return undefined;
  }

  const checkoutRow = await db.query.checkout.findFirst({
    where: eq(checkout.id, paymentRow.checkoutId)
  });

  if (checkoutRow?.status !== "pending") {
    console.info(`Checkout ${paymentRow.checkoutId} missing or already processed.`);
    return undefined;
  }

  return { checkoutId: paymentRow.checkoutId, email: checkoutRow.email, paymentId: paymentRow.id, userId: checkoutRow.userId };
}

/**
 * Atomically converts a paid checkout into an order: marks the payment
 * succeeded, the checkout completed, writes the order + its items, and consumes
 * the reserved stock. No-ops (returns `undefined`) when the checkout is no
 * longer pending. Returns the new order id on success.
 */
async function fulfillCheckout({ amount, currency, lines, transactionId }: FulfillCheckoutInput): Promise<string | undefined> {
  const context = await findPendingCheckoutByTransaction(transactionId);
  if (context === undefined) {
    return undefined;
  }

  const orderId = crypto.randomUUID();

  // D1 has no interactive transactions; the batch API runs every statement
  // atomically. The order row precedes its items so the FK resolves.
  const tail =
    lines.length > EMPTY_ITEMS
      ? [
          db.insert(orderItem).values(
            lines.map((line) => ({
              orderId,
              quantity: line.qty,
              subtotal: line.price * line.qty,
              title: line.title,
              total: line.price * line.qty,
              unitPrice: line.price,
              variantId: line.variantId
            }))
          ),
          ...lines.map((line) =>
            db
              .update(inventory)
              .set({ quantityReserved: sql`${inventory.quantityReserved} - ${line.qty}` })
              .where(eq(inventory.variantId, line.variantId))
          )
        ]
      : [];

  await db.batch([
    db.update(payment).set({ status: "succeeded" }).where(eq(payment.transactionId, transactionId)),
    db.update(checkout).set({ status: "completed" }).where(eq(checkout.id, context.checkoutId)),
    db.insert(order).values({
      checkoutId: context.checkoutId,
      currencyCode: currency,
      email: context.email,
      id: orderId,
      paymentId: context.paymentId,
      status: "processing",
      subtotal: amount,
      total: amount,
      userId: context.userId
    }),
    ...tail
  ]);

  return orderId;
}

/**
 * Atomically unwinds a pending checkout after a failed or expired session:
 * marks the payment failed, the checkout failed, and returns reserved stock to
 * available. No-ops when the checkout is no longer pending.
 */
async function releaseCheckout({ lines, transactionId }: ReleaseCheckoutInput): Promise<void> {
  const context = await findPendingCheckoutByTransaction(transactionId);
  if (context === undefined) {
    return;
  }

  await db.batch([
    db.update(payment).set({ status: "failed" }).where(eq(payment.transactionId, transactionId)),
    db.update(checkout).set({ status: "failed" }).where(eq(checkout.id, context.checkoutId)),
    ...lines.map((line) =>
      db
        .update(inventory)
        .set({
          quantityAvailable: sql`${inventory.quantityAvailable} + ${line.qty}`,
          quantityReserved: sql`max(0, ${inventory.quantityReserved} - ${line.qty})`
        })
        .where(eq(inventory.variantId, line.variantId))
    )
  ]);
}

export const checkoutAccessors = {
  createCheckoutAndAddress,
  fulfillCheckout,
  releaseCheckout
};

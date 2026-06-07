import { eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { address } from "~/src/modules/address/address.schema";
import { checkout } from "~/src/modules/checkout/checkout.schema";
import type { CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod";
import { inventory } from "~/src/modules/inventory/inventory.schema";
import { orderItem } from "~/src/modules/order-item/order-item.schema";
import { order } from "~/src/modules/order/order.schema";
import { payment } from "~/src/modules/payment/payment.schema";

export interface PendingCheckout {
  checkoutId: string;
  email: string;
  paymentId: string;
  userId: string | null;
}

export interface FulfillmentLine {
  handle?: string;
  imageUrl?: string;
  price: number;
  qty: number;
  title: string;
  variantId: string;
}

export interface ReleaseLine {
  qty: number;
  variantId: string;
}

export interface FulfillCheckoutInput {
  amount: number;
  currency: string;
  lines: FulfillmentLine[];
  locale?: string;
  transactionId: string;
}

export interface ReleaseCheckoutInput {
  lines: ReleaseLine[];
  transactionId: string;
}

const EMPTY_ITEMS = 0;

export function prepareCreateCheckoutBatch(
  checkoutValues: CheckoutFormSchema,
  userId: string | undefined,
  userEmail: string
): { checkoutId: string; statements: BatchItem<"sqlite">[] } {
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
    customerNote: checkoutValues.deliveryNotes,
    deliveryMethodId: checkoutValues.deliveryMethod,
    email: userEmail,
    id: checkoutId,
    lockerId: checkoutValues.lockerId,
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

  const statements = billingInsert === undefined ? [shippingInsert, checkoutInsert] : [shippingInsert, billingInsert, checkoutInsert];

  return { checkoutId, statements };
}

export function resolvePendingCheckout(
  paymentRow: { checkoutId: string; id: string } | undefined,
  checkoutRow: { email: string; status: string; userId: string | null } | undefined,
  transactionId: string
): PendingCheckout | undefined {
  if (paymentRow === undefined) {
    console.info(`No live payment for transaction ${transactionId}; ignoring.`);
    return undefined;
  }

  if (checkoutRow?.status !== "pending") {
    console.info(`Checkout ${paymentRow.checkoutId} missing or already processed.`);
    return undefined;
  }

  return { checkoutId: paymentRow.checkoutId, email: checkoutRow.email, paymentId: paymentRow.id, userId: checkoutRow.userId };
}

export function prepareUpdateCheckoutDeliveryBatch(checkoutId: string, checkoutValues: CheckoutFormSchema): BatchItem<"sqlite"> {
  return db
    .update(checkout)
    .set({
      customerNote: checkoutValues.deliveryNotes,
      deliveryMethodId: checkoutValues.deliveryMethod,
      lockerId: checkoutValues.lockerId
    })
    .where(eq(checkout.id, checkoutId));
}

export function prepareFulfillCheckoutBatch(
  context: PendingCheckout,
  { amount, currency, lines, locale, transactionId }: FulfillCheckoutInput,
  checkoutSnapshot?: {
    readonly customerNote?: string | null;
    readonly deliveryMethodId?: string | null;
    readonly lockerId?: string | null;
  }
): { orderId: string; statements: BatchItem<"sqlite">[] } {
  const orderId = crypto.randomUUID();
  const itemsSubtotal = lines.reduce((sum, line) => sum + line.price * line.qty, EMPTY_ITEMS);
  const shippingTotal = Math.max(amount - itemsSubtotal, EMPTY_ITEMS);

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

  return {
    orderId,
    statements: [
      db.update(payment).set({ status: "succeeded" }).where(eq(payment.transactionId, transactionId)),
      db.update(checkout).set({ status: "completed" }).where(eq(checkout.id, context.checkoutId)),
      db.insert(order).values({
        checkoutId: context.checkoutId,
        currencyCode: currency,
        customerNote: checkoutSnapshot?.customerNote,
        deliveryMethodId: checkoutSnapshot?.deliveryMethodId,
        email: context.email,
        id: orderId,
        lockerId: checkoutSnapshot?.lockerId,
        metadata: locale === undefined || locale === "" ? undefined : JSON.stringify({ locale }),
        paymentId: context.paymentId,
        shippingTotal,
        status: "processing",
        subtotal: itemsSubtotal,
        total: amount,
        userId: context.userId
      }),
      ...tail
    ]
  };
}

export function prepareReleaseCheckoutBatch(
  context: PendingCheckout,
  { lines, transactionId }: ReleaseCheckoutInput
): BatchItem<"sqlite">[] {
  return [
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
  ];
}

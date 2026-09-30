import { and, eq, sql } from "drizzle-orm"
import { type BatchItem } from "drizzle-orm/batch"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { address } from "~/src/modules/address/address.schema"
import { checkout } from "~/src/modules/checkout/checkout.schema"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { inventory } from "~/src/modules/inventory/inventory.schema"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import { order } from "~/src/modules/order/order.schema"
import { payment } from "~/src/modules/payment/payment.schema"

export interface PendingCheckout {
  checkoutId: string
  email: string
  paymentId: string
  userId: string | null
}

export interface FulfillmentLine {
  handle?: string | undefined
  imageUrl?: string | undefined
  price: number
  qty: number
  title: string
  variantId: string
}

export interface ReleaseLine {
  qty: number
  variantId: string
}

export interface FulfillCheckoutInput {
  amount: number
  currency: string
  lines: FulfillmentLine[]
  locale?: string
  transactionId: string
}

export interface ReleaseCheckoutInput {
  lines: ReleaseLine[]
  transactionId: string
}

export const prepareCreateCheckoutBatch = (
  checkoutValues: CheckoutFormSchema,
  userId: string | undefined,
  userEmail: string,
): { checkoutId: string; statements: BatchItem<"sqlite">[] } => {
  const checkoutId = crypto.randomUUID()
  const shippingAddressId = crypto.randomUUID()
  const billingAddressId = checkoutValues.sameAsShipping === true ? shippingAddressId : crypto.randomUUID()

  const shippingInsert = db.insert(address).values({
    address1: checkoutValues.address1,
    address2: checkoutValues.address2,
    city: checkoutValues.city,
    countryCode: checkoutValues.countryCode,
    firstName: checkoutValues.firstName,
    id: shippingAddressId,
    isDefault: checkoutValues.saveShippingAddress,
    lastName: checkoutValues.lastName,
    phone: checkoutValues.phone,
    postalCode: checkoutValues.postalCode,
    province: checkoutValues.province,
    userId,
  })

  const checkoutInsert = db.insert(checkout).values({
    billingAddressId,
    customerNote: checkoutValues.deliveryNotes,
    deliveryMethodId: checkoutValues.deliveryMethod,
    email: userEmail,
    id: checkoutId,
    lockerId: checkoutValues.lockerId,
    shippingAddressId,
    status: "pending",
    userId,
  })

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
          userId,
        })

  const statements = billingInsert === undefined ? [shippingInsert, checkoutInsert] : [shippingInsert, billingInsert, checkoutInsert]

  return { checkoutId, statements }
}

export const resolvePendingCheckout = (
  paymentRow: { checkoutId: string; id: string } | undefined,
  checkoutRow: { email: string; status: string; userId: string | null } | undefined,
  transactionId: string,
): PendingCheckout | undefined => {
  if (paymentRow === undefined) {
    console.info(`No live payment for transaction ${transactionId}; ignoring.`)

    return undefined
  }

  if (checkoutRow?.status !== "pending") {
    console.info(`Checkout ${paymentRow.checkoutId} missing or already processed.`)

    return undefined
  }

  return { checkoutId: paymentRow.checkoutId, email: checkoutRow.email, paymentId: paymentRow.id, userId: checkoutRow.userId }
}

const preparePendingCheckoutAddressUpsert = (checkoutId: string, values: typeof address.$inferInsert): BatchItem<"sqlite"> => {
  // INSERT SELECT requires the table's column order, including the timestamps appended by its schema.
  const addressFields = {
    address1: sql<string>`${values.address1}`.as("address1"),
    address2: sql<string | null>`${values.address2 ?? sql`NULL`}`.as("address2"),
    city: sql<string>`${values.city}`.as("city"),
    countryCode: sql<string>`${values.countryCode}`.as("country_code"),
    firstName: sql<string | null>`${values.firstName ?? sql`NULL`}`.as("first_name"),
    id: sql<string>`${values.id}`.as("id"),
    isDefault: sql<boolean>`${sql.param(values.isDefault ?? false, address.isDefault)}`.as("is_default"),
    lastName: sql<string | null>`${values.lastName ?? sql`NULL`}`.as("last_name"),
    phone: sql<string | null>`${values.phone ?? sql`NULL`}`.as("phone"),
    postalCode: sql<string | null>`${values.postalCode ?? sql`NULL`}`.as("postal_code"),
    province: sql<string | null>`${values.province ?? sql`NULL`}`.as("province"),
    userId: sql<string | null>`${values.userId ?? sql`NULL`}`.as("user_id"),
  }
  const fields = Object.assign(addressFields, {
    createdAt: sql<Date>`${sql.param(new Date(), address.createdAt)}`.as("created_at"),
    updatedAt: sql<Date>`${sql.param(new Date(), address.updatedAt)}`.as("updated_at"),
  })
  const pendingAddress = db
    .select(fields)
    .from(checkout)
    .where(and(eq(checkout.id, checkoutId), eq(checkout.status, "pending")))

  // No pending source row means neither an insert nor a conflict update runs.
  return db
    .insert(address)
    .select(pendingAddress)
    .onConflictDoUpdate({
      set: { ...values, address2: values.address2 ?? sql`NULL`, province: values.province ?? sql`NULL` },
      target: address.id,
    })
}

export const prepareUpdateCheckoutDeliveryBatch = (
  context: Pick<typeof checkout.$inferSelect, "id" | "shippingAddressId" | "billingAddressId" | "userId">,
  checkoutValues: CheckoutFormSchema,
): [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] => {
  const pendingCheckout = and(eq(checkout.id, context.id), eq(checkout.status, "pending"))
  const shippingAddressId = context.shippingAddressId ?? crypto.randomUUID()
  let billingAddressId = shippingAddressId
  if (checkoutValues.sameAsShipping === false) {
    billingAddressId =
      context.billingAddressId === shippingAddressId ? crypto.randomUUID() : (context.billingAddressId ?? crypto.randomUUID())
  }
  const shippingValues = {
    address1: checkoutValues.address1,
    address2: checkoutValues.address2,
    city: checkoutValues.city,
    countryCode: checkoutValues.countryCode,
    firstName: checkoutValues.firstName,
    id: shippingAddressId,
    isDefault: checkoutValues.saveShippingAddress ?? false,
    lastName: checkoutValues.lastName,
    phone: checkoutValues.phone,
    postalCode: checkoutValues.postalCode,
    province: checkoutValues.province,
    userId: context.userId,
  }
  const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [preparePendingCheckoutAddressUpsert(context.id, shippingValues)]

  if (billingAddressId !== shippingAddressId) {
    const billingValues = {
      address1: checkoutValues.billingAddress1 ?? "",
      city: checkoutValues.billingCity ?? "",
      countryCode: checkoutValues.billingCountryCode ?? "",
      firstName: checkoutValues.billingFirstName ?? "",
      id: billingAddressId,
      isDefault: checkoutValues.saveBillingAddress ?? false,
      lastName: checkoutValues.billingLastName ?? "",
      phone: checkoutValues.phone,
      postalCode: checkoutValues.billingPostalCode ?? "",
      userId: context.userId,
    }
    statements.push(preparePendingCheckoutAddressUpsert(context.id, billingValues))
  }

  statements.push(
    db
      .update(checkout)
      .set({
        billingAddressId,
        customerNote: checkoutValues.deliveryNotes,
        deliveryMethodId: checkoutValues.deliveryMethod,
        email: checkoutValues.email,
        lockerId: checkoutValues.lockerId ?? sql`NULL`,
        shippingAddressId,
      })
      .where(pendingCheckout)
      .returning({ id: checkout.id }),
  )

  return statements
}

export const prepareFulfillCheckoutBatch = (
  context: PendingCheckout,
  { amount, currency, lines, locale, transactionId }: FulfillCheckoutInput,
  checkoutSnapshot?: {
    readonly customerNote?: string | null | undefined
    readonly deliveryMethodId?: string | null | undefined
    readonly lockerId?: string | null | undefined
  },
): { orderId: string; statements: BatchItem<"sqlite">[] } => {
  const orderId = crypto.randomUUID()
  const itemsSubtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0)
  const shippingTotal = Math.max(amount - itemsSubtotal, 0)

  const tail =
    lines.length > 0
      ? [
          db.insert(orderItem).values(
            lines.map((line) => ({
              orderId,
              quantity: line.qty,
              subtotal: line.price * line.qty,
              title: line.title,
              total: line.price * line.qty,
              unitPrice: line.price,
              variantId: line.variantId,
            })),
          ),
          ...lines.map((line) =>
            db
              .update(inventory)
              .set({ quantityReserved: sql`${inventory.quantityReserved} - ${line.qty}` })
              .where(eq(inventory.variantId, line.variantId)),
          ),
        ]
      : []

  return {
    orderId,
    statements: [
      db.update(payment).set({ status: "succeeded" }).where(eq(payment.transactionId, transactionId)),
      db
        .update(checkout)
        .set({ status: "completed" })
        .where(and(eq(checkout.id, context.checkoutId), eq(checkout.status, "pending"))),
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
        userId: context.userId,
      }),
      ...tail,
    ],
  }
}

export const prepareReleaseCheckoutBatch = (
  context: PendingCheckout,
  { lines, transactionId }: ReleaseCheckoutInput,
): BatchItem<"sqlite">[] => [
  db.update(payment).set({ status: "failed" }).where(eq(payment.transactionId, transactionId)),
  db.update(checkout).set({ status: "failed" }).where(eq(checkout.id, context.checkoutId)),
  ...lines.map((line) =>
    db
      .update(inventory)
      .set({
        quantityAvailable: sql`${inventory.quantityAvailable} + min(${inventory.quantityReserved}, ${line.qty})`,
        quantityReserved: sql`max(0, ${inventory.quantityReserved} - ${line.qty})`,
      })
      .where(eq(inventory.variantId, line.variantId)),
  ),
]

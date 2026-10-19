import { and, eq, exists, inArray, notInArray, sql } from "drizzle-orm"
import { type BatchItem } from "drizzle-orm/batch"

import { insertRowChunks } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { address } from "~/src/modules/address/address.schema"
import { checkout } from "~/src/modules/checkout/checkout.schema"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { prepareDiscountClaim } from "~/src/modules/discount/discount.claim.server"
import { discountClaim } from "~/src/modules/discount/discount.schema"
import { inventory } from "~/src/modules/inventory/inventory.schema"
import { orderAddress } from "~/src/modules/order-address/order-address.schema"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import { order } from "~/src/modules/order/order.schema"
import { type OrderTotals } from "~/src/modules/order/order.types"
import { prepareOrderNumberAllocation } from "~/src/modules/order/use-cases/allocate-order-number.server"
import { payment } from "~/src/modules/payment/payment.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { user } from "~/src/modules/user/user.schema"

export interface PrepareCreateCheckoutInput {
  readonly checkoutValues: CheckoutFormSchema
  readonly clientAddress: string
  readonly discountId?: string | undefined
  readonly lockerPoint?: string | undefined
  readonly lockerUnconfirmed?: boolean | undefined
  readonly userEmail: string
  readonly userId: string | undefined
}

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
  currency: string
  lines: FulfillmentLine[]
  locale?: string | undefined
  totals: OrderTotals
  transactionId: string
}

const UNKNOWN_NAME = ""

export interface CheckoutAddressSnapshot {
  readonly address1: string
  readonly address2?: string | null | undefined
  readonly city: string
  readonly countryCode: string
  readonly firstName?: string | null | undefined
  readonly lastName?: string | null | undefined
  readonly phone?: string | null | undefined
  readonly postalCode?: string | null | undefined
  readonly province?: string | null | undefined
}

export interface CheckoutFulfillmentSnapshot {
  readonly billingAddress?: CheckoutAddressSnapshot | null | undefined
  readonly billingCompanyName?: string | null | undefined
  readonly billingNip?: string | null | undefined
  readonly customerNote?: string | null | undefined
  readonly deliveryMethodId?: string | null | undefined
  readonly discountId?: string | null | undefined
  readonly lockerId?: string | null | undefined
  readonly lockerPoint?: string | null | undefined
  readonly lockerUnconfirmed?: boolean | undefined
  readonly shippingAddress?: CheckoutAddressSnapshot | null | undefined
}

interface CompanyInvoiceDetails {
  readonly billingCompanyName: string | undefined
  readonly billingNip: string | undefined
}

const NO_COMPANY_INVOICE: CompanyInvoiceDetails = { billingCompanyName: undefined, billingNip: undefined }

const resolveCompanyInvoice = ({ billingCompanyName, billingNip, companyInvoice }: CheckoutFormSchema): CompanyInvoiceDetails =>
  companyInvoice === true ? { billingCompanyName, billingNip } : NO_COMPANY_INVOICE

export interface ReleaseCheckoutInput {
  lines: ReleaseLine[]
  transactionId: string
}

const prepareCheckoutDiscountClaim = (
  { checkoutId, email, userId }: Readonly<{ checkoutId: string; email: string; userId: string | undefined }>,
  discountId: string | undefined,
): [] | [BatchItem<"sqlite">, BatchItem<"sqlite">] => {
  if (discountId === undefined) {
    return []
  }

  const claimOfCheckout = db
    .select({ id: discountClaim.id })
    .from(discountClaim)
    .where(and(eq(discountClaim.checkoutId, checkoutId), eq(discountClaim.discountId, discountId)))

  return [
    prepareDiscountClaim({ checkoutId, discountId, email, userId }),
    db
      .update(checkout)
      .set({ discountId })
      .where(and(eq(checkout.id, checkoutId), exists(claimOfCheckout)))
      .returning({ discountId: checkout.discountId }),
  ]
}

export const prepareCreateCheckoutBatch = ({
  checkoutValues,
  clientAddress,
  discountId,
  lockerPoint,
  lockerUnconfirmed,
  userEmail,
  userId,
}: PrepareCreateCheckoutInput): { checkoutId: string; statements: [...BatchItem<"sqlite">[], BatchItem<"sqlite">] } => {
  const checkoutId = crypto.randomUUID()
  const shippingAddressId = crypto.randomUUID()
  const billingAddressId = checkoutValues.sameAsShipping === true ? shippingAddressId : crypto.randomUUID()
  const companyInvoice = resolveCompanyInvoice(checkoutValues)

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
    userId: checkoutValues.saveShippingAddress === true ? userId : undefined,
  })

  const checkoutInsert = db.insert(checkout).values({
    billingAddressId,
    billingCompanyName: companyInvoice.billingCompanyName,
    billingNip: companyInvoice.billingNip,
    clientAddress,
    customerNote: checkoutValues.deliveryNotes,
    deliveryMethodId: checkoutValues.deliveryMethod,
    email: userEmail,
    id: checkoutId,
    lockerId: checkoutValues.lockerId,
    lockerPoint,
    lockerUnconfirmed,
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
          userId: checkoutValues.saveBillingAddress === true ? userId : undefined,
        })

  const savesAddress = checkoutValues.saveShippingAddress === true || checkoutValues.saveBillingAddress === true
  const clearDefaults =
    savesAddress && userId !== undefined
      ? [
          db
            .update(address)
            .set({ isDefault: false })
            .where(and(eq(address.userId, userId), eq(address.isDefault, true))),
        ]
      : []
  const addressInserts = billingInsert === undefined ? [shippingInsert] : [shippingInsert, billingInsert]

  return {
    checkoutId,
    statements: [
      ...clearDefaults,
      ...addressInserts,
      checkoutInsert,
      ...prepareCheckoutDiscountClaim({ checkoutId, email: userEmail, userId }, discountId),
    ],
  }
}

export const resolvePendingCheckout = (
  paymentRow: { checkoutId: string; id: string } | undefined,
  checkoutRow: { email: string; status: string; userId: string | null } | undefined,
  transactionId: string,
): PendingCheckout | undefined => {
  if (paymentRow === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND, `No payment carries Checkout Session ${transactionId}`)
  }

  if (checkoutRow === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND, `Checkout ${paymentRow.checkoutId} no longer exists`)
  }

  if (checkoutRow.status === "completed") {
    console.info(`Checkout ${paymentRow.checkoutId} already completed.`)

    return undefined
  }

  if (checkoutRow.status !== "pending") {
    throw new AppError(ERROR_CODES.NOT_FOUND, `Checkout ${paymentRow.checkoutId} is ${checkoutRow.status}, so it cannot become an order`)
  }

  return { checkoutId: paymentRow.checkoutId, email: checkoutRow.email, paymentId: paymentRow.id, userId: checkoutRow.userId }
}

interface PendingCheckoutAddressValues {
  readonly address1: string
  readonly address2?: string | null | undefined
  readonly city: string
  readonly countryCode: string
  readonly firstName: string
  readonly id: string
  readonly isDefault: boolean
  readonly lastName: string
  readonly phone: string
  readonly postalCode: string
  readonly province?: string | null | undefined
  readonly userId: string | null | undefined
}

const preparePendingCheckoutAddressUpsert = (checkoutId: string, values: PendingCheckoutAddressValues): BatchItem<"sqlite"> => {
  const columnsBeforeTimestamps = {
    address1: sql<string>`${values.address1}`.as("address1"),
    address2: sql<string | null>`${values.address2 ?? sql`NULL`}`.as("address2"),
    city: sql<string>`${values.city}`.as("city"),
    countryCode: sql<string>`${values.countryCode}`.as("country_code"),
    firstName: sql<string>`${values.firstName}`.as("first_name"),
    id: sql<string>`${values.id}`.as("id"),
    isDefault: sql<boolean>`${sql.param(values.isDefault, address.isDefault)}`.as("is_default"),
    lastName: sql<string>`${values.lastName}`.as("last_name"),
    phone: sql<string>`${values.phone}`.as("phone"),
    postalCode: sql<string>`${values.postalCode}`.as("postal_code"),
    province: sql<string | null>`${values.province ?? sql`NULL`}`.as("province"),
    userId: sql<string | null>`${values.userId ?? sql`NULL`}`.as("user_id"),
  }
  const columnsInTableOrder = Object.assign(columnsBeforeTimestamps, {
    createdAt: sql<Date>`${sql.param(new Date(), address.createdAt)}`.as("created_at"),
    updatedAt: sql<Date>`${sql.param(new Date(), address.updatedAt)}`.as("updated_at"),
  })
  const addressOfPendingCheckout = db
    .select(columnsInTableOrder)
    .from(checkout)
    .where(and(eq(checkout.id, checkoutId), eq(checkout.status, "pending")))

  return db
    .insert(address)
    .select(addressOfPendingCheckout)
    .onConflictDoUpdate({
      set: {
        ...values,
        address2: values.address2 ?? sql`NULL`,
        province: values.province ?? sql`NULL`,
        userId: values.userId ?? sql`NULL`,
      },
      target: address.id,
    })
}

export const prepareUpdateCheckoutDeliveryBatch = (
  context: Pick<typeof checkout.$inferSelect, "id" | "shippingAddressId" | "billingAddressId" | "userId">,
  checkoutValues: CheckoutFormSchema,
  {
    discountId,
    lockerPoint,
    lockerUnconfirmed = false,
  }: Pick<PrepareCreateCheckoutInput, "discountId" | "lockerPoint" | "lockerUnconfirmed"> = {},
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
    userId: checkoutValues.saveShippingAddress === true ? context.userId : undefined,
  }
  const billingValues =
    billingAddressId === shippingAddressId
      ? undefined
      : {
          address1: checkoutValues.billingAddress1 ?? "",
          city: checkoutValues.billingCity ?? "",
          countryCode: checkoutValues.billingCountryCode ?? "",
          firstName: checkoutValues.billingFirstName ?? "",
          id: billingAddressId,
          isDefault: checkoutValues.saveBillingAddress ?? false,
          lastName: checkoutValues.billingLastName ?? "",
          phone: checkoutValues.phone,
          postalCode: checkoutValues.billingPostalCode ?? "",
          userId: checkoutValues.saveBillingAddress === true ? context.userId : undefined,
        }
  const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [preparePendingCheckoutAddressUpsert(context.id, shippingValues)]
  const companyInvoice = resolveCompanyInvoice(checkoutValues)

  if (billingValues !== undefined) {
    statements.push(preparePendingCheckoutAddressUpsert(context.id, billingValues))
  }

  if (context.userId !== null && (shippingValues.isDefault || billingValues?.isDefault === true)) {
    const otherDefaultAddresses = and(
      eq(address.userId, context.userId),
      eq(address.isDefault, true),
      notInArray(address.id, [shippingAddressId, billingAddressId]),
      exists(db.select({ id: checkout.id }).from(checkout).where(pendingCheckout)),
    )
    statements.push(db.update(address).set({ isDefault: false }).where(otherDefaultAddresses))
  }

  statements.push(
    db
      .update(checkout)
      .set({
        billingAddressId,
        billingCompanyName: companyInvoice.billingCompanyName ?? sql`NULL`,
        billingNip: companyInvoice.billingNip ?? sql`NULL`,
        customerNote: checkoutValues.deliveryNotes,
        deliveryMethodId: checkoutValues.deliveryMethod,
        discountId: discountId ?? sql`NULL`,
        email: checkoutValues.email,
        lockerId: checkoutValues.lockerId ?? sql`NULL`,
        lockerPoint: lockerPoint ?? sql`NULL`,
        lockerUnconfirmed,
        shippingAddressId,
      })
      .where(pendingCheckout)
      .returning({ id: checkout.id }),
  )

  return statements
}

const toOrderAddressValues = (
  orderId: string,
  checkoutSnapshot: CheckoutFulfillmentSnapshot | undefined,
): (typeof orderAddress.$inferInsert)[] =>
  (
    [
      { source: checkoutSnapshot?.shippingAddress, type: "shipping" },
      { source: checkoutSnapshot?.billingAddress, type: "billing" },
    ] as const
  ).flatMap(({ source, type }) =>
    source === null || source === undefined
      ? []
      : [
          {
            address1: source.address1,
            address2: source.address2 ?? undefined,
            city: source.city,
            countryCode: source.countryCode,
            firstName: source.firstName ?? UNKNOWN_NAME,
            lastName: source.lastName ?? UNKNOWN_NAME,
            orderId,
            phone: source.phone ?? undefined,
            postalCode: source.postalCode ?? undefined,
            province: source.province ?? undefined,
            type,
          },
        ],
  )

const verifiedAccountWithEmail = (email: string) =>
  sql<
    string | null
  >`(select ${user.id} from ${user} where lower(${user.email}) = ${email.trim().toLowerCase()} and ${user.emailVerified} = 1 limit 1)`

export const prepareFulfillCheckoutBatch = (
  context: PendingCheckout,
  { currency, lines, locale, totals, transactionId }: FulfillCheckoutInput,
  checkoutSnapshot?: CheckoutFulfillmentSnapshot,
): { orderId: string; statements: BatchItem<"sqlite">[] } => {
  const orderId = crypto.randomUUID()
  const orderNumberAllocation = prepareOrderNumberAllocation()

  const addressSnapshots = toOrderAddressValues(orderId, checkoutSnapshot)
  const tail =
    lines.length > 0
      ? [
          ...insertRowChunks(orderItem, lines).map((chunk) =>
            db.insert(orderItem).values(
              chunk.map((line) => ({
                orderId,
                productId: sql<string>`(select ${productVariant.productId} from ${productVariant} where ${productVariant.id} = ${line.variantId})`,
                quantity: line.qty,
                subtotal: line.price * line.qty,
                thumbnail: line.imageUrl,
                title: line.title,
                total: line.price * line.qty,
                unitPrice: line.price,
                variantId: sql`(select ${productVariant.id} from ${productVariant} where ${productVariant.id} = ${line.variantId})`,
              })),
            ),
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
        .set({ clientAddress: sql`NULL`, status: "completed" })
        .where(and(eq(checkout.id, context.checkoutId), eq(checkout.status, "pending"))),
      orderNumberAllocation.statement,
      db.insert(order).values({
        billingCompanyName: checkoutSnapshot?.billingCompanyName,
        billingNip: checkoutSnapshot?.billingNip,
        checkoutId: context.checkoutId,
        currencyCode: currency,
        customerNote: checkoutSnapshot?.customerNote,
        deliveryMethodId: checkoutSnapshot?.deliveryMethodId,
        discountId: checkoutSnapshot?.discountId,
        discountTotal: totals.discountTotal,
        email: context.email,
        id: orderId,
        lockerId: checkoutSnapshot?.lockerId,
        lockerPoint: checkoutSnapshot?.lockerPoint,
        lockerUnconfirmed: checkoutSnapshot?.lockerUnconfirmed,
        metadata: locale === undefined || locale === "" ? undefined : JSON.stringify({ locale }),
        orderNumber: orderNumberAllocation.orderNumber,
        paymentId: context.paymentId,
        shippingTotal: totals.shippingTotal,
        status: "processing",
        subtotal: totals.subtotal,
        taxBasisPoints: totals.vatBasisPoints,
        taxTotal: totals.taxTotal,
        total: totals.total,
        userId: context.userId ?? verifiedAccountWithEmail(context.email),
      }),
      ...(addressSnapshots.length > 0 ? [db.insert(orderAddress).values(addressSnapshots)] : []),
      ...tail,
    ],
  }
}

export const prepareReleaseCheckoutBatch = ({
  lines,
  transactionId,
}: ReleaseCheckoutInput): [...BatchItem<"sqlite">[], BatchItem<"sqlite">] => {
  const pendingSessionPayment = and(eq(payment.transactionId, transactionId), eq(payment.status, "pending"))
  const releasableSession = db
    .select({ checkoutId: payment.checkoutId })
    .from(payment)
    .innerJoin(checkout, eq(checkout.id, payment.checkoutId))
    .where(and(pendingSessionPayment, eq(checkout.status, "pending")))
  const sessionPaymentOfCheckout = db
    .select({ id: payment.id })
    .from(payment)
    .where(and(eq(payment.checkoutId, checkout.id), pendingSessionPayment))
  const failedCheckoutOfPayment = db
    .select({ id: checkout.id })
    .from(checkout)
    .where(and(eq(checkout.id, payment.checkoutId), eq(checkout.status, "failed")))

  return [
    ...lines.map((line) =>
      db
        .update(inventory)
        .set({
          quantityAvailable: sql`${inventory.quantityAvailable} + min(${inventory.quantityReserved}, ${line.qty})`,
          quantityReserved: sql`max(0, ${inventory.quantityReserved} - ${line.qty})`,
        })
        .where(and(eq(inventory.variantId, line.variantId), exists(releasableSession))),
    ),
    db.delete(discountClaim).where(inArray(discountClaim.checkoutId, releasableSession)),
    db
      .update(checkout)
      .set({ clientAddress: sql`NULL`, status: "failed" })
      .where(and(eq(checkout.status, "pending"), exists(sessionPaymentOfCheckout))),
    db
      .update(payment)
      .set({ status: "failed" })
      .where(and(pendingSessionPayment, exists(failedCheckoutOfPayment)))
      .returning({ id: payment.id }),
  ]
}

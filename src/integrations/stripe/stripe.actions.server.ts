import { getRequest } from "@tanstack/react-start/server"
import type StripeType from "stripe"
import { type z } from "zod"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import {
  type CreateCheckoutSessionInput,
  type UpdateCheckoutSessionInput,
  type cartItemSchema,
} from "~/src/integrations/stripe/stripe.actions.schemas"
import { CHECKOUT_SESSION_LIFETIME_SECONDS, STRIPE_CURRENCY } from "~/src/integrations/stripe/stripe.constants"
import { deleteCheckoutCoupons, toSessionDiscounts } from "~/src/integrations/stripe/stripe.coupons.server"
import { ensureStripeCustomer, getStripeCustomerId } from "~/src/integrations/stripe/stripe.customer.server"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { isSellPriceCentsValid } from "~/src/modules/_core/utils/currency"
import {
  type CheckoutReleaseLine,
  parseCheckoutSessionReleaseLines,
  readCheckoutSessionItemsJson,
  toCheckoutSessionItemsMetadata,
} from "~/src/modules/checkout/checkout-metadata.zod"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { createCheckout } from "~/src/modules/checkout/use-cases/create-checkout.server"
import { releaseCheckout } from "~/src/modules/checkout/use-cases/release-checkout.server"
import { supersedeCheckoutSession } from "~/src/modules/checkout/use-cases/supersede-checkout-session.server"
import { updateCheckoutDelivery } from "~/src/modules/checkout/use-cases/update-checkout-delivery.server"
import { getActiveDeliveryMethodByIdQuery } from "~/src/modules/delivery-method/delivery-method.accessors"
import { resolveCheckoutDiscount } from "~/src/modules/discount/discount.checkout.server"
import { type Discount } from "~/src/modules/discount/discount.types"
import { releaseInventoryForItems } from "~/src/modules/inventory/inventory.accessors"
import { sumHeldQuantity } from "~/src/modules/inventory/inventory.availability.utils"
import { reserveInventoryByVariantLines, reserveInventoryForItems } from "~/src/modules/inventory/inventory.utils"
import { type OrderTotals, computeOrderTotals, sumOrderLineSubtotal } from "~/src/modules/order/order.totals"
import { createPendingPayment, getPaymentContextByTransactionId } from "~/src/modules/payment/payment.accessors"
import { getProductsWithInventoryByHandles } from "~/src/modules/product/product.accessors"

import { resolveRequestOrigin } from "~/src/lib/request"
import { buildLocalizedUrl } from "~/src/lib/seo"
import { resolveAssetURL } from "~/src/lib/url"

import { ROUTES } from "~/src/routes"

const EMPTY_VARIANTS_COUNT = 0

const NO_COST = 0

const SHIPPING_QUANTITY = 1

const SHIPPING_LABEL = "Shipping"

const CLIENT_SECRET_MISSING = "Failed to create Checkout Session: client_secret is missing"

const MILLISECONDS_PER_SECOND = 1000

type CartItem = z.infer<typeof cartItemSchema>

interface OrderLine {
  handle: string
  imageUrl: string
  priceCents: number
  qty: number
  title: string
  variantId: string
}

interface SessionLineItem {
  price_data: { currency: string; product_data: { name: string }; unit_amount: number }
  quantity: number
}

type ResolvedProducts = Awaited<ReturnType<typeof getProductsWithInventoryByHandles>>

type ResolvedProduct = ResolvedProducts[number]

type ResolvedVariant = Omit<ResolvedProduct["variants"][number], "inventory"> & {
  inventory: ResolvedProduct["variants"][number]["inventory"] | null
}

const resolveShippingCost = async (deliveryMethodId: string): Promise<number> => {
  if (deliveryMethodId === "") {
    return NO_COST
  }

  const method = await getActiveDeliveryMethodByIdQuery(deliveryMethodId)

  return method?.price ?? NO_COST
}

const resolveVariant = (products: ResolvedProducts, item: CartItem): { product: ResolvedProduct; variant: ResolvedVariant } => {
  const product = products.find((candidate) => candidate.handle === item.slug)
  if (product === undefined || product.variants.length === EMPTY_VARIANTS_COUNT) {
    throw new AppError(ERROR_CODES.NOT_FOUND, CHECKOUT_ERROR_CODES.PRODUCT_NOT_FOUND)
  }

  const variant = product.variants.find((candidate) => candidate.id === item.variantId)
  if (variant === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND, CHECKOUT_ERROR_CODES.VARIANT_NOT_FOUND)
  }

  if (!isSellPriceCentsValid(variant.price)) {
    throw new AppError(ERROR_CODES.VALIDATION, CHECKOUT_ERROR_CODES.INVALID_PRICE)
  }

  return { product, variant }
}

const validateAndCalculateItems = async (items: CartItem[], heldLines: readonly CheckoutReleaseLine[]) => {
  const products = await getProductsWithInventoryByHandles(items.map((item) => item.slug))

  return items.map((item) => {
    const { product, variant } = resolveVariant(products, item)

    const inv = variant.inventory
    if (inv === null || inv.quantityAvailable + sumHeldQuantity(heldLines, variant.id) < item.qty) {
      throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY)
    }

    return {
      ...item,
      currentVersion: inv.version,
      inventoryId: inv.id,
      lineTitle: item.variantTitle === "" ? item.title : `${item.title} — ${item.variantTitle}`,
      priceCents: variant.price,
      productId: product.id,
      variantId: variant.id,
      variantTitle: variant.title,
    }
  })
}

const toLineItems = (lines: OrderLine[], shippingCost: number): SessionLineItem[] => {
  const currency = STRIPE_CURRENCY
  const lineItems: SessionLineItem[] = lines.map((line) => ({
    price_data: { currency, product_data: { name: line.title }, unit_amount: line.priceCents },
    quantity: line.qty,
  }))

  if (shippingCost > NO_COST) {
    lineItems.push({
      price_data: { currency, product_data: { name: SHIPPING_LABEL }, unit_amount: shippingCost },
      quantity: SHIPPING_QUANTITY,
    })
  }

  return lineItems
}

const sumItemsSubtotal = (lines: OrderLine[]): number =>
  sumOrderLineSubtotal(lines.map((line) => ({ price: line.priceCents, qty: line.qty })))

interface CheckoutQuoteArgs {
  discount: Discount["applied"] | undefined
  lines: OrderLine[]
  shippingCost: number
}

interface CheckoutQuote {
  lines: { qty: number; unitPrice: number; variantId: string }[]
  totals: OrderTotals
}

const quoteCheckout = ({ discount, lines, shippingCost }: CheckoutQuoteArgs): CheckoutQuote => ({
  lines: lines.map((line) => ({ qty: line.qty, unitPrice: line.priceCents, variantId: line.variantId })),
  totals: computeOrderTotals({
    discountTotal: discount?.amountMinorUnits,
    itemsSubtotal: sumItemsSubtotal(lines),
    shippingTotal: shippingCost,
  }),
})

const toMetaItems = (lines: OrderLine[]): Record<string, string> =>
  toCheckoutSessionItemsMetadata(
    lines.map((line) => ({
      handle: line.handle,
      imageUrl: line.imageUrl,
      price: line.priceCents,
      qty: line.qty,
      title: line.title,
      variantId: line.variantId,
    })),
  )

interface CreateSessionArgs {
  checkoutId: string
  customerId: string | undefined
  discount: Discount["applied"] | undefined
  email: string
  lines: OrderLine[]
  origin: string
  shippingCost: number
  userId: string | undefined
}

const createStripeSession = async ({ checkoutId, customerId, discount, email, lines, origin, shippingCost, userId }: CreateSessionArgs) => {
  const locale = getCurrentLocale()
  const returnUrl = `${buildLocalizedUrl(origin, ROUTES.CHECKOUT, locale)}?success=true&session_id={CHECKOUT_SESSION_ID}`
  const metadata = {
    checkoutId,
    discountCode: discount?.code ?? "",
    discountTotal: String(discount?.amountMinorUnits ?? NO_COST),
    locale,
    userId: userId ?? "",
    ...toMetaItems(lines),
  }

  const params: StripeType.Checkout.SessionCreateParams = {
    expires_at: Math.floor(Date.now() / MILLISECONDS_PER_SECOND) + CHECKOUT_SESSION_LIFETIME_SECONDS,
    line_items: toLineItems(lines, shippingCost),
    metadata,
    mode: "payment",
    payment_intent_data: { metadata, receipt_email: email },
    return_url: returnUrl,
    ui_mode: "elements",
    ...(customerId === undefined
      ? { customer_email: email }
      : { customer: customerId, saved_payment_method_options: { payment_method_save: "enabled" } }),
  }
  const discounts = await toSessionDiscounts({ checkoutId, discount })
  if (discounts.length > NO_COST) {
    params.discounts = discounts
  }

  const session = await stripe.checkout.sessions.create(params).catch(async (error: unknown) => {
    await deleteCheckoutCoupons({ checkoutId, discounts })
    throw error
  })

  if (typeof session.client_secret !== "string") {
    throw new TypeError(CLIENT_SECRET_MISSING)
  }

  const amount = session.amount_total ?? NO_COST

  return { amount, clientSecret: session.client_secret, sessionId: session.id }
}

type ValidatedCheckoutItem = Awaited<ReturnType<typeof validateAndCalculateItems>>[number]

const toOrderLines = (validatedItems: ValidatedCheckoutItem[]): OrderLine[] =>
  validatedItems.map((item) => ({
    handle: item.slug,
    imageUrl: resolveAssetURL(item.image),
    priceCents: item.priceCents,
    qty: item.qty,
    title: item.lineTitle,
    variantId: item.variantId,
  }))

const toReservedLines = (validatedItems: ValidatedCheckoutItem[]): CheckoutReleaseLine[] =>
  validatedItems.map((item) => ({ qty: item.qty, variantId: item.variantId }))

export const handleCreateCheckoutSession = async (data: CreateCheckoutSessionInput) => {
  const origin = resolveRequestOrigin(getRequest())
  const session = await getRequestSession()
  const userId = session?.user.id
  const { email } = data.checkoutValues
  const customerId =
    session?.user === undefined ? undefined : await ensureStripeCustomer({ email, name: session.user.name, userId: session.user.id })

  const validatedItems = await validateAndCalculateItems(data.items, [])
  const lines = toOrderLines(validatedItems)
  const shippingCost = await resolveShippingCost(data.checkoutValues.deliveryMethod)
  const discount = await resolveCheckoutDiscount({
    code: data.checkoutValues.discountCode,
    email,
    itemsSubtotal: sumItemsSubtotal(lines),
    shippingTotal: shippingCost,
  })

  await reserveInventoryForItems(validatedItems)

  try {
    const checkoutId = await createCheckout({
      checkoutValues: data.checkoutValues,
      discountId: discount?.discountId,
      userEmail: email,
      userId,
    })

    const result = await createStripeSession({
      checkoutId,
      customerId,
      discount,
      email,
      lines,
      origin,
      shippingCost,
      userId,
    })

    await createPendingPayment({
      amount: result.amount,
      checkoutId,
      currency: STRIPE_CURRENCY.toUpperCase(),
      provider: "stripe",
      reservedLines: toReservedLines(validatedItems),
      transactionId: result.sessionId,
    })

    scheduleProductCatalogInvalidation()

    return { ...result, ...quoteCheckout({ discount, lines, shippingCost }) }
  } catch (error) {
    await releaseInventoryForItems(validatedItems).catch((releaseError: unknown) => {
      console.error("Failed to release inventory after checkout error:", releaseError)
    })
    console.error("Stripe/DB error:", error)

    throw error
  }
}

interface SignedInUser {
  id: string
  name: string
}

interface UpdatableCheckout {
  checkoutId: string
  heldLines: CheckoutReleaseLine[]
  ownerId: string | undefined
  signedInUser: SignedInUser | undefined
}

const readHeldLines = (session: StripeType.Checkout.Session): CheckoutReleaseLine[] =>
  parseCheckoutSessionReleaseLines(readCheckoutSessionItemsJson(session.metadata))

const releaseExpiredCheckoutSession = async (session: StripeType.Checkout.Session): Promise<void> => {
  try {
    await releaseCheckout({ lines: readHeldLines(session), transactionId: session.id })
    scheduleProductCatalogInvalidation()
  } catch (releaseError) {
    console.error(`Failed to release expired Checkout Session ${session.id} before replacing it:`, releaseError)
  }
}

const resolveUpdatableCheckout = async (sessionId: string): Promise<UpdatableCheckout> => {
  const context = await getPaymentContextByTransactionId(sessionId)
  if (context === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND, CHECKOUT_ERROR_CODES.SESSION_CLOSED)
  }

  const requestSession = await getRequestSession()
  const signedInUser = requestSession?.user
  if (context.userId !== undefined && signedInUser?.id !== context.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, CHECKOUT_ERROR_CODES.SESSION_CLOSED)
  }

  if (context.checkoutStatus !== "pending" || context.paymentStatus !== "pending") {
    throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.SESSION_CLOSED)
  }

  const stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
  if (stripeSession.status === "expired") {
    await releaseExpiredCheckoutSession(stripeSession)
  }

  if (stripeSession.status !== "open") {
    throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.SESSION_CLOSED)
  }

  return {
    checkoutId: context.checkoutId,
    heldLines: readHeldLines(stripeSession),
    ownerId: context.userId,
    signedInUser,
  }
}

interface ReplacementCustomerArgs {
  email: string
  ownerId: string | undefined
  signedInUser: SignedInUser
}

const findReplacementCustomerId = ({ email, ownerId, signedInUser }: ReplacementCustomerArgs): Promise<string | undefined> =>
  ownerId === undefined ? ensureStripeCustomer({ email, name: signedInUser.name, userId: signedInUser.id }) : getStripeCustomerId(ownerId)

const expireCheckoutSession = async (sessionId: string): Promise<void> => {
  await stripe.checkout.sessions.expire(sessionId).catch((expireError: unknown) => {
    console.error(`Failed to expire Checkout Session ${sessionId}:`, expireError)
  })
}

interface RetireCheckoutSessionArgs {
  heldLines: CheckoutReleaseLine[]
  oldSessionId: string
  replacement: { amount: number; sessionId: string }
  reservedLines: CheckoutReleaseLine[]
  userId: string | undefined
}

const retireCheckoutSession = async ({
  heldLines,
  oldSessionId,
  replacement,
  reservedLines,
  userId,
}: RetireCheckoutSessionArgs): Promise<void> => {
  try {
    await stripe.checkout.sessions.expire(oldSessionId)
    const superseded = await supersedeCheckoutSession({
      amount: replacement.amount,
      heldLines,
      newTransactionId: replacement.sessionId,
      oldTransactionId: oldSessionId,
      reservedLines,
      userId,
    })
    if (!superseded) {
      throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.SESSION_CLOSED)
    }
  } catch (error) {
    await expireCheckoutSession(replacement.sessionId)

    throw error
  }
}

const abandonReplacementCheckout = async (replacementSessionId: string, reservedLines: CheckoutReleaseLine[]): Promise<void> => {
  await releaseCheckout({ lines: reservedLines, transactionId: replacementSessionId }).catch((releaseError: unknown) => {
    console.error("Failed to release checkout after checkout update error:", releaseError)
  })
  await expireCheckoutSession(replacementSessionId)
  scheduleProductCatalogInvalidation()
}

interface ReserveReplacementCheckoutArgs {
  checkoutId: string
  checkoutValues: CheckoutFormSchema
  discountId: string | undefined
  replacementSessionId: string
  validatedItems: ValidatedCheckoutItem[]
}

const reserveReplacementCheckout = async ({
  checkoutId,
  checkoutValues,
  discountId,
  replacementSessionId,
  validatedItems,
}: ReserveReplacementCheckoutArgs): Promise<void> => {
  try {
    await reserveInventoryByVariantLines(validatedItems)
  } catch (error) {
    console.error("Failed to reserve the edited cart during checkout session update:", error)
    await abandonReplacementCheckout(replacementSessionId, [])

    throw error
  }

  try {
    await updateCheckoutDelivery(checkoutId, checkoutValues, discountId)
  } catch (error) {
    console.error("Failed to save the edited delivery during checkout session update:", error)
    await abandonReplacementCheckout(replacementSessionId, validatedItems)

    throw error
  }
}

export const handleUpdateCheckoutSession = async (data: UpdateCheckoutSessionInput) => {
  const origin = resolveRequestOrigin(getRequest())
  const { checkoutId, heldLines, ownerId, signedInUser } = await resolveUpdatableCheckout(data.sessionId)
  const validatedItems = await validateAndCalculateItems(data.items, heldLines)
  const lines = toOrderLines(validatedItems)
  const shippingCost = await resolveShippingCost(data.checkoutValues.deliveryMethod)
  const discount = await resolveCheckoutDiscount({
    code: data.checkoutValues.discountCode,
    email: data.checkoutValues.email,
    itemsSubtotal: sumItemsSubtotal(lines),
    shippingTotal: shippingCost,
  })

  const customerId =
    signedInUser === undefined ? undefined : await findReplacementCustomerId({ email: data.checkoutValues.email, ownerId, signedInUser })
  const replacement = await createStripeSession({
    checkoutId,
    customerId,
    discount,
    email: data.checkoutValues.email,
    lines,
    origin,
    shippingCost,
    userId: signedInUser?.id,
  })

  await retireCheckoutSession({
    heldLines,
    oldSessionId: data.sessionId,
    replacement,
    reservedLines: toReservedLines(validatedItems),
    userId: signedInUser?.id,
  })
  await reserveReplacementCheckout({
    checkoutId,
    checkoutValues: data.checkoutValues,
    discountId: discount?.discountId,
    replacementSessionId: replacement.sessionId,
    validatedItems,
  })
  scheduleProductCatalogInvalidation()

  return { ...replacement, ...quoteCheckout({ discount, lines, shippingCost }) }
}

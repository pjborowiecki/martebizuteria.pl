import { env } from "cloudflare:workers"

import { getRequest } from "@tanstack/react-start/server"
import type StripeType from "stripe"
import { type z } from "zod"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { fetchPointByName } from "~/src/integrations/inpost/inpost.api"
import { INPOST_POINT_NAME_PATTERN } from "~/src/integrations/inpost/inpost.constants"
import { serializeInpostLockerPoint } from "~/src/integrations/inpost/inpost.utils"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import {
  type CreateCheckoutSessionInput,
  type UpdateCheckoutSessionInput,
  type cartItemSchema,
} from "~/src/integrations/stripe/stripe.actions.schemas"
import { CHECKOUT_SESSION_LIFETIME_SECONDS, STRIPE_CURRENCY } from "~/src/integrations/stripe/stripe.constants"
import { deleteCheckoutCoupons, toSessionDiscounts } from "~/src/integrations/stripe/stripe.coupons.server"
import { ensureStripeCustomerWithEmail } from "~/src/integrations/stripe/stripe.customer.server"
import { stripeDeploymentOf } from "~/src/integrations/stripe/stripe.deployment"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { isCheckoutSessionProcessing } from "~/src/integrations/stripe/stripe.utils"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { isSellPriceCentsValid } from "~/src/modules/_core/utils/currency"
import { type CheckoutFulfillmentLine, type CheckoutPaymentMetadata } from "~/src/modules/checkout/checkout-metadata.zod"
import { OPEN_CHECKOUTS_PER_CLIENT_ADDRESS_MAX, OPEN_CHECKOUTS_PER_EMAIL_MAX } from "~/src/modules/checkout/checkout.constants"
import { type ReleaseLine } from "~/src/modules/checkout/checkout.utils"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { countOpenCheckouts } from "~/src/modules/checkout/use-cases/count-open-checkouts.server"
import { createCheckout } from "~/src/modules/checkout/use-cases/create-checkout.server"
import { forgetCheckoutClientAddress } from "~/src/modules/checkout/use-cases/forget-checkout-client-address.server"
import { releaseCheckout } from "~/src/modules/checkout/use-cases/release-checkout.server"
import { supersedeCheckoutSession } from "~/src/modules/checkout/use-cases/supersede-checkout-session.server"
import { updateCheckoutDelivery } from "~/src/modules/checkout/use-cases/update-checkout-delivery.server"
import { getOfferedDeliveryMethodByIdQuery } from "~/src/modules/delivery-method/delivery-method.accessors"
import { DELIVERY_METHOD, type DeliveryMethodType } from "~/src/modules/delivery-method/delivery-method.constants"
import { resolveDeliveryPrice } from "~/src/modules/delivery-method/delivery-method.utils"
import { resolveCheckoutDiscount } from "~/src/modules/discount/discount.checkout.server"
import {
  claimCheckoutDiscount,
  keepClaimedDiscount,
  releaseDiscountClaims,
  releaseUnappliedDiscountClaims,
} from "~/src/modules/discount/discount.claim.server"
import { type Discount } from "~/src/modules/discount/discount.types"
import { releaseInventoryForItems } from "~/src/modules/inventory/inventory.accessors"
import { quantitiesBeyond, sumHeldQuantity } from "~/src/modules/inventory/inventory.availability.utils"
import { reserveInventoryForItems } from "~/src/modules/inventory/inventory.utils"
import { type OrderTotals, computeOrderTotals, sumOrderLineSubtotal } from "~/src/modules/order/order.totals"
import {
  createPendingPayment,
  getHeldLinesByTransactionId,
  getPaymentContextByTransactionId,
} from "~/src/modules/payment/payment.accessors"
import { isProductLevelImage } from "~/src/modules/product-image/product-image.utils"
import { DEFAULT_VARIANT_TITLE } from "~/src/modules/product-variant/product-variant.utils"
import { getPublishedProductsWithInventoryByHandles } from "~/src/modules/product/product.accessors"
import { resolveProductTitle } from "~/src/modules/product/product.utils"
import { isSalesPaused } from "~/src/modules/store-setting/store-setting.accessors"
import { resolveAccountAddress } from "~/src/modules/user-email-history/user-email-history.accessors"

import { clientAddress } from "~/src/lib/rate-limit"
import { resolveRequestOrigin } from "~/src/lib/request"
import { buildLocalizedUrl } from "~/src/lib/seo"
import { resolveAssetURL } from "~/src/lib/url"

import type checkoutMessages from "~/messages/en-US/pages.checkout.json"
import { ROUTES } from "~/src/routes"

const EMPTY_VARIANTS_COUNT = 0

const NO_COST = 0

const SHIPPING_QUANTITY = 1

const CHECKOUT_NAMESPACE = "pages.checkout"

const CLIENT_SECRET_MISSING = "Failed to create Checkout Session: client_secret is missing"

const MILLISECONDS_PER_SECOND = 1000

type CartItem = z.infer<typeof cartItemSchema>

type CheckoutSessionValues = CreateCheckoutSessionInput["checkoutValues"]

interface OrderLine {
  handle: string
  imageUrl: string | undefined
  inventoryId: string
  priceCents: number
  qty: number
  title: string
  variantId: string
}

interface SessionLineItem {
  price_data: { currency: string; product_data: { name: string }; unit_amount: number }
  quantity: number
}

interface DeliveryLine {
  cost: number
  name: string
}

type ResolvedProducts = Awaited<ReturnType<typeof getPublishedProductsWithInventoryByHandles>>

type ResolvedProduct = ResolvedProducts[number]

type ResolvedVariant = Omit<ResolvedProduct["variants"][number], "inventory"> & {
  inventory: ResolvedProduct["variants"][number]["inventory"] | null
}

interface LockerConfirmation {
  lockerPoint: string | undefined
  lockerUnconfirmed: boolean
}

interface ResolvedDelivery extends LockerConfirmation {
  checkoutValues: CheckoutSessionValues
  deliveryPrice: number
  deliveryType: DeliveryMethodType
  freeDeliveryThreshold: number | undefined
}

const assertSalesOpen = async (): Promise<void> => {
  if (await isSalesPaused()) {
    throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.SALES_PAUSED)
  }
}

interface AdmittedCheckout {
  origin: string
  visitorAddress: string
}

const admitNewCheckout = async ({ checkoutValues }: CreateCheckoutSessionInput): Promise<AdmittedCheckout> => {
  await assertSalesOpen()
  const request = getRequest()
  const visitorAddress = clientAddress(request.headers)
  const open = await countOpenCheckouts({ clientAddress: visitorAddress, email: checkoutValues.email })
  if (open.byClientAddress >= OPEN_CHECKOUTS_PER_CLIENT_ADDRESS_MAX || open.byEmail >= OPEN_CHECKOUTS_PER_EMAIL_MAX) {
    throw new AppError(ERROR_CODES.TOO_MANY_REQUESTS, CHECKOUT_ERROR_CODES.TOO_MANY_OPEN_CHECKOUTS)
  }

  return { origin: resolveRequestOrigin(request), visitorAddress }
}

const confirmLocker = (lockerId: string): Promise<LockerConfirmation> =>
  fetchPointByName(lockerId).then(
    (point) => {
      if (point === undefined) {
        throw new AppError(ERROR_CODES.VALIDATION, CHECKOUT_ERROR_CODES.LOCKER_NOT_FOUND)
      }

      return { lockerPoint: serializeInpostLockerPoint(point), lockerUnconfirmed: false }
    },
    (error: unknown) => {
      console.error(`InPost could not confirm parcel locker ${lockerId}, so the order asks the shop to check it:`, error)

      return { lockerPoint: undefined, lockerUnconfirmed: true }
    },
  )

const resolveDelivery = async (checkoutValues: CheckoutSessionValues): Promise<ResolvedDelivery> => {
  const method = await getOfferedDeliveryMethodByIdQuery(checkoutValues.deliveryMethod)
  if (method === undefined) {
    throw new AppError(ERROR_CODES.VALIDATION, CHECKOUT_ERROR_CODES.DELIVERY_METHOD_UNAVAILABLE)
  }

  if (method.type !== DELIVERY_METHOD.LOCKER) {
    return {
      checkoutValues: { ...checkoutValues, lockerId: undefined },
      deliveryPrice: method.price,
      deliveryType: method.type,
      freeDeliveryThreshold: method.freeDeliveryThreshold,
      lockerPoint: undefined,
      lockerUnconfirmed: false,
    }
  }

  const lockerId = checkoutValues.lockerId?.trim()
  if (lockerId === undefined || !INPOST_POINT_NAME_PATTERN.test(lockerId)) {
    throw new AppError(ERROR_CODES.VALIDATION, CHECKOUT_ERROR_CODES.LOCKER_REQUIRED)
  }

  return {
    ...(await confirmLocker(lockerId)),
    checkoutValues: { ...checkoutValues, lockerId },
    deliveryPrice: method.price,
    deliveryType: method.type,
    freeDeliveryThreshold: method.freeDeliveryThreshold,
  }
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

const lineTitleOf = (product: ResolvedProduct, variant: ResolvedVariant, locale: string): string => {
  const title = resolveProductTitle(product.titles, locale)

  return variant.title === DEFAULT_VARIANT_TITLE ? title : `${title} — ${variant.title}`
}

const lineImageUrlOf = (product: ResolvedProduct, variantId: string): string | undefined => {
  const image =
    product.images.find((candidate) => candidate.variantId === variantId) ??
    product.images.find((candidate) => isProductLevelImage(candidate.variantId))
  const source = image?.url ?? product.thumbnail

  return typeof source === "string" ? resolveAssetURL(source) : undefined
}

const validateAndCalculateItems = async (items: CartItem[], heldLines: readonly ReleaseLine[]): Promise<OrderLine[]> => {
  const products = await getPublishedProductsWithInventoryByHandles(items.map((item) => item.slug))
  const locale = getCurrentLocale()

  return items.map((item) => {
    const { product, variant } = resolveVariant(products, item)

    const inv = variant.inventory
    if (inv === null || inv.quantityAvailable + sumHeldQuantity(heldLines, variant.id) < item.qty) {
      throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY)
    }

    return {
      handle: product.handle,
      imageUrl: lineImageUrlOf(product, variant.id),
      inventoryId: inv.id,
      priceCents: variant.price,
      qty: item.qty,
      title: lineTitleOf(product, variant, locale),
      variantId: variant.id,
    }
  })
}

const toLineItems = (lines: OrderLine[], delivery: DeliveryLine): SessionLineItem[] => {
  const currency = STRIPE_CURRENCY
  const lineItems: SessionLineItem[] = lines.map((line) => ({
    price_data: { currency, product_data: { name: line.title }, unit_amount: line.priceCents },
    quantity: line.qty,
  }))

  if (delivery.cost > NO_COST) {
    lineItems.push({
      price_data: { currency, product_data: { name: delivery.name }, unit_amount: delivery.cost },
      quantity: SHIPPING_QUANTITY,
    })
  }

  return lineItems
}

const sumItemsSubtotal = (lines: OrderLine[]): number =>
  sumOrderLineSubtotal(lines.map((line) => ({ price: line.priceCents, qty: line.qty })))

const resolveCheckoutPricing = async ({ checkoutValues, deliveryPrice, freeDeliveryThreshold, lines }: Readonly<CheckoutPricingArgs>) => {
  const itemsSubtotal = sumItemsSubtotal(lines)
  const shippingFor = (discount: Discount["applied"] | undefined): number =>
    resolveDeliveryPrice({ discount, freeDeliveryThreshold, itemsSubtotal, price: deliveryPrice })
  const applicableDiscount = await resolveCheckoutDiscount({
    code: checkoutValues.discountCode,
    email: checkoutValues.email,
    itemsSubtotal,
    shippingTotal: shippingFor(undefined),
  })

  return { applicableDiscount, shippingFor }
}

interface CheckoutPricingArgs extends Pick<ResolvedDelivery, "checkoutValues" | "deliveryPrice" | "freeDeliveryThreshold"> {
  lines: OrderLine[]
}

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

const toCheckoutLines = (lines: OrderLine[]): CheckoutFulfillmentLine[] =>
  lines.map((line) => ({
    handle: line.handle,
    imageUrl: line.imageUrl,
    price: line.priceCents,
    qty: line.qty,
    title: line.title,
    variantId: line.variantId,
  }))

interface CreateSessionArgs {
  checkoutId: string
  customerId: string | undefined
  deliveryType: DeliveryMethodType
  discount: Discount["applied"] | undefined
  email: string
  lines: OrderLine[]
  origin: string
  shippingCost: number
  userId: string | undefined
}

const createStripeSession = async ({
  checkoutId,
  customerId,
  deliveryType,
  discount,
  email,
  lines,
  origin,
  shippingCost,
  userId,
}: CreateSessionArgs) => {
  const locale = getCurrentLocale()
  const messages = await loadNamespace<typeof checkoutMessages>({ locale, namespace: CHECKOUT_NAMESPACE })
  const returnUrl = `${buildLocalizedUrl(origin, ROUTES.CHECKOUT, locale)}?success=true&session_id={CHECKOUT_SESSION_ID}`
  const metadata = {
    checkoutId,
    deployment: stripeDeploymentOf(env.APP_ENV),
    discountCode: discount?.code ?? "",
    discountTotal: String(discount?.amountMinorUnits ?? NO_COST),
    locale,
    shippingTotal: String(shippingCost),
    userId: userId ?? "",
  } satisfies CheckoutPaymentMetadata

  const params: StripeType.Checkout.SessionCreateParams = {
    expires_at: Math.floor(Date.now() / MILLISECONDS_PER_SECOND) + CHECKOUT_SESSION_LIFETIME_SECONDS,
    line_items: toLineItems(lines, { cost: shippingCost, name: messages.deliveryLineItem[deliveryType] }),
    metadata,
    mode: "payment",
    payment_intent_data: { description: messages.paymentDescription, metadata, receipt_email: email },
    phone_number_collection: { enabled: true },
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

const toReservedLines = (lines: OrderLine[]): ReleaseLine[] => lines.map((line) => ({ qty: line.qty, variantId: line.variantId }))

interface OpenCheckoutSessionArgs extends CreateSessionArgs {
  reservedLines: ReleaseLine[]
}

const openCheckoutSession = async ({ reservedLines, ...sessionArgs }: OpenCheckoutSessionArgs) => {
  try {
    const result = await createStripeSession(sessionArgs)
    await createPendingPayment({
      amount: result.amount,
      checkoutId: sessionArgs.checkoutId,
      currency: STRIPE_CURRENCY.toUpperCase(),
      lines: toCheckoutLines(sessionArgs.lines),
      provider: "stripe",
      reservedLines,
      transactionId: result.sessionId,
    })

    return result
  } catch (error) {
    await forgetCheckoutClientAddress(sessionArgs.checkoutId).catch((forgetError: unknown) => {
      console.error("Failed to clear the client address after checkout error:", forgetError)
    })
    if (sessionArgs.discount !== undefined) {
      await releaseDiscountClaims(sessionArgs.checkoutId).catch((releaseError: unknown) => {
        console.error("Failed to release the discount claim after checkout error:", releaseError)
      })
    }

    throw error
  }
}

const withAccountAddress = async (checkoutValues: CheckoutSessionValues, userId: string | undefined): Promise<CheckoutSessionValues> =>
  userId === undefined ? checkoutValues : { ...checkoutValues, email: await resolveAccountAddress({ email: checkoutValues.email, userId }) }

export const handleCreateCheckoutSession = async (data: CreateCheckoutSessionInput) => {
  const { origin, visitorAddress } = await admitNewCheckout(data)
  const session = await getRequestSession()
  const userId = session?.user.id
  const { checkoutValues, deliveryPrice, deliveryType, freeDeliveryThreshold, lockerPoint, lockerUnconfirmed } = await resolveDelivery(
    await withAccountAddress(data.checkoutValues, userId),
  )
  const { email } = checkoutValues
  const customerId =
    session?.user === undefined
      ? undefined
      : await ensureStripeCustomerWithEmail({ email, name: session.user.name, userId: session.user.id })

  const lines = await validateAndCalculateItems(data.items, [])
  const { applicableDiscount, shippingFor } = await resolveCheckoutPricing({ checkoutValues, deliveryPrice, freeDeliveryThreshold, lines })

  await reserveInventoryForItems(lines)

  try {
    const { checkoutId, discountClaimed } = await createCheckout({
      checkoutValues,
      clientAddress: visitorAddress,
      discountId: applicableDiscount?.discountId,
      lockerPoint,
      lockerUnconfirmed,
      userEmail: email,
      userId,
    })
    const discount = keepClaimedDiscount(applicableDiscount, discountClaimed)
    const shippingCost = shippingFor(discount)
    const result = await openCheckoutSession({
      checkoutId,
      customerId,
      deliveryType,
      discount,
      email,
      lines,
      origin,
      reservedLines: toReservedLines(lines),
      shippingCost,
      userId,
    })

    scheduleProductCatalogInvalidation()

    return { ...result, ...quoteCheckout({ discount, lines, shippingCost }) }
  } catch (error) {
    await releaseInventoryForItems(lines).catch((releaseError: unknown) => {
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
  checkoutCreatedAt: Date
  checkoutId: string
  heldLines: ReleaseLine[]
  signedInUser: SignedInUser | undefined
}

export const releaseExpiredCheckoutSession = async (session: StripeType.Checkout.Session): Promise<void> => {
  try {
    await releaseCheckout({ lines: await getHeldLinesByTransactionId(session.id), transactionId: session.id })
    scheduleProductCatalogInvalidation()
  } catch (releaseError) {
    console.error(`Failed to release expired Checkout Session ${session.id} ahead of its webhook:`, releaseError)
  }
}

const retrieveReplaceableStripeSession = async (sessionId: string): Promise<StripeType.Checkout.Session> => {
  const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] })
  if (isCheckoutSessionProcessing(stripeSession)) {
    throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.SESSION_PROCESSING)
  }

  if (stripeSession.status === "complete") {
    throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.SESSION_COMPLETE)
  }

  if (stripeSession.status === "expired") {
    await releaseExpiredCheckoutSession(stripeSession)
  }

  if (stripeSession.status !== "open") {
    throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.SESSION_CLOSED)
  }

  return stripeSession
}

const resolveUpdatableCheckout = async (sessionId: string): Promise<UpdatableCheckout> => {
  const context = await getPaymentContextByTransactionId(sessionId)
  if (context === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND, CHECKOUT_ERROR_CODES.SESSION_CLOSED)
  }

  if (context.paymentStatus === "succeeded" || context.paymentStatus === "refunded") {
    throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.SESSION_COMPLETE)
  }

  const requestSession = await getRequestSession()
  const signedInUser = requestSession?.user
  if (context.userId !== undefined && signedInUser?.id !== context.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, CHECKOUT_ERROR_CODES.SESSION_CLOSED)
  }

  if (context.checkoutStatus !== "pending" || context.paymentStatus !== "pending") {
    throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.SESSION_CLOSED)
  }

  const stripeSession = await retrieveReplaceableStripeSession(sessionId)

  return {
    checkoutCreatedAt: context.checkoutCreatedAt,
    checkoutId: context.checkoutId,
    heldLines: await getHeldLinesByTransactionId(stripeSession.id),
    signedInUser,
  }
}

const assertCheckoutStillEditable = async (sessionId: string, checkoutCreatedAt: Date): Promise<void> => {
  const editingClosesAt = checkoutCreatedAt.getTime() + CHECKOUT_SESSION_LIFETIME_SECONDS * MILLISECONDS_PER_SECOND
  if (Date.now() < editingClosesAt) {
    return
  }

  await releaseExpiredCheckoutSession(await stripe.checkout.sessions.expire(sessionId))
  throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.SESSION_CLOSED)
}

const expireCheckoutSession = async (sessionId: string): Promise<void> => {
  await stripe.checkout.sessions.expire(sessionId).catch((expireError: unknown) => {
    console.error(`Failed to expire Checkout Session ${sessionId}:`, expireError)
  })
}

interface RetireCheckoutSessionArgs {
  discountId: string | undefined
  heldLines: ReleaseLine[]
  lines: CheckoutFulfillmentLine[]
  oldSessionId: string
  replacement: { amount: number; sessionId: string }
  reservedLines: ReleaseLine[]
  userId: string | undefined
}

const retireCheckoutSession = async ({
  discountId,
  heldLines,
  lines,
  oldSessionId,
  replacement,
  reservedLines,
  userId,
}: RetireCheckoutSessionArgs): Promise<void> => {
  try {
    await stripe.checkout.sessions.expire(oldSessionId)
    const superseded = await supersedeCheckoutSession({
      amount: replacement.amount,
      discountId,
      heldLines,
      lines,
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

interface ReplaceCheckoutSessionArgs extends Omit<RetireCheckoutSessionArgs, "discountId" | "lines" | "replacement"> {
  addedStock: OrderLine[]
  session: CreateSessionArgs
}

const handOverCheckoutSession = async ({ addedStock, session, ...retirement }: ReplaceCheckoutSessionArgs) => {
  await reserveInventoryForItems(addedStock)
  try {
    const replacement = await createStripeSession(session)
    await retireCheckoutSession({
      ...retirement,
      discountId: session.discount?.discountId,
      lines: toCheckoutLines(session.lines),
      replacement,
    })

    return replacement
  } catch (error) {
    await releaseInventoryForItems(addedStock).catch((releaseError: unknown) => {
      console.error("Failed to release the stock the edited cart added after checkout update error:", releaseError)
    })

    throw error
  }
}

const replaceCheckoutSession = async (args: ReplaceCheckoutSessionArgs) => {
  try {
    return await handOverCheckoutSession(args)
  } catch (error) {
    if (args.session.discount !== undefined) {
      await releaseUnappliedDiscountClaims(args.session.checkoutId).catch((releaseError: unknown) => {
        console.error("Failed to release the discount claim after checkout update error:", releaseError)
      })
    }

    throw error
  }
}

const abandonReplacementCheckout = async (replacementSessionId: string, reservedLines: ReleaseLine[]): Promise<void> => {
  await releaseCheckout({ lines: reservedLines, transactionId: replacementSessionId }).catch((releaseError: unknown) => {
    console.error("Failed to release checkout after checkout update error:", releaseError)
  })
  await expireCheckoutSession(replacementSessionId)
  scheduleProductCatalogInvalidation()
}

interface SaveReplacementDeliveryArgs extends LockerConfirmation {
  checkoutId: string
  checkoutValues: CheckoutFormSchema
  discountId: string | undefined
  lines: OrderLine[]
  replacementSessionId: string
}

const saveReplacementDelivery = async ({
  checkoutId,
  checkoutValues,
  discountId,
  lines,
  lockerPoint,
  lockerUnconfirmed,
  replacementSessionId,
}: SaveReplacementDeliveryArgs): Promise<void> => {
  try {
    await updateCheckoutDelivery(checkoutId, checkoutValues, { discountId, lockerPoint, lockerUnconfirmed })
  } catch (error) {
    console.error("Failed to save the edited delivery during checkout session update:", error)
    await abandonReplacementCheckout(replacementSessionId, lines)

    throw error
  }
}

export const handleUpdateCheckoutSession = async (data: UpdateCheckoutSessionInput) => {
  const origin = resolveRequestOrigin(getRequest())
  const { checkoutCreatedAt, checkoutId, heldLines, signedInUser } = await resolveUpdatableCheckout(data.sessionId)
  await assertSalesOpen()
  await assertCheckoutStillEditable(data.sessionId, checkoutCreatedAt)
  const lines = await validateAndCalculateItems(data.items, heldLines)
  const { checkoutValues, deliveryPrice, deliveryType, freeDeliveryThreshold, lockerPoint, lockerUnconfirmed } = await resolveDelivery(
    await withAccountAddress(data.checkoutValues, signedInUser?.id),
  )
  const { applicableDiscount, shippingFor } = await resolveCheckoutPricing({ checkoutValues, deliveryPrice, freeDeliveryThreshold, lines })

  const customerId =
    signedInUser === undefined
      ? undefined
      : await ensureStripeCustomerWithEmail({ email: checkoutValues.email, name: signedInUser.name, userId: signedInUser.id })
  const discount = await claimCheckoutDiscount({ applied: applicableDiscount, checkoutId, email: checkoutValues.email })
  const shippingCost = shippingFor(discount)
  const replacement = await replaceCheckoutSession({
    addedStock: quantitiesBeyond(lines, heldLines),
    heldLines,
    oldSessionId: data.sessionId,
    reservedLines: toReservedLines(lines),
    session: {
      checkoutId,
      customerId,
      deliveryType,
      discount,
      email: checkoutValues.email,
      lines,
      origin,
      shippingCost,
      userId: signedInUser?.id,
    },
    userId: signedInUser?.id,
  })
  await saveReplacementDelivery({
    checkoutId,
    checkoutValues,
    discountId: discount?.discountId,
    lines,
    lockerPoint,
    lockerUnconfirmed,
    replacementSessionId: replacement.sessionId,
  })
  scheduleProductCatalogInvalidation()

  return { ...replacement, ...quoteCheckout({ discount, lines, shippingCost }) }
}

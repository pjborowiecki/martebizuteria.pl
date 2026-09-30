import { getRequestHeader } from "@tanstack/react-start/server"
import { type z } from "zod"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import {
  type CreateCheckoutSessionInput,
  type UpdateCheckoutSessionInput,
  type cartItemSchema,
} from "~/src/integrations/stripe/stripe.actions.schemas"
import { STRIPE_CURRENCY } from "~/src/integrations/stripe/stripe.constants"
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
import { updateCheckoutDelivery } from "~/src/modules/checkout/use-cases/update-checkout-delivery.server"
import { getActiveDeliveryMethodByIdQuery } from "~/src/modules/delivery-method/delivery-method.accessors"
import { releaseInventoryByVariantLines, releaseInventoryForItems } from "~/src/modules/inventory/inventory.accessors"
import { reserveInventoryByVariantLines, reserveInventoryForItems } from "~/src/modules/inventory/inventory.utils"
import { createPendingPayment, getPaymentContextByTransactionId, repointPayment } from "~/src/modules/payment/payment.accessors"
import { getProductsWithInventoryByHandles } from "~/src/modules/product/product.accessors"

import { resolveAssetURL } from "~/src/lib/url"

import { APP_URL } from "~/src/presentation/branding/app"

const EMPTY_VARIANTS_COUNT = 0

const NO_COST = 0

const SHIPPING_QUANTITY = 1

const SHIPPING_LABEL = "Shipping"

const CLIENT_SECRET_MISSING = "Failed to create Checkout Session: client_secret is missing"

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

const validateAndCalculateItems = async (items: CartItem[]) => {
  const products = await getProductsWithInventoryByHandles(items.map((item) => item.slug))

  return items.map((item) => {
    const { product, variant } = resolveVariant(products, item)

    const inv = variant.inventory
    if (inv === null || inv.quantityAvailable < item.qty) {
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

const resolveOrigin = (): string => {
  const origin = getRequestHeader("origin")
  if (origin !== undefined && origin !== "") {
    return origin
  }

  const referer = getRequestHeader("referer")
  if (referer !== undefined && referer !== "") {
    try {
      return new URL(referer).origin
    } catch {
      return APP_URL
    }
  }

  return APP_URL
}

interface CreateSessionArgs {
  checkoutId: string
  email: string
  lines: OrderLine[]
  shippingCost: number
  userId: string | undefined
}

const createStripeSession = async ({ checkoutId, email, lines, shippingCost, userId }: CreateSessionArgs) => {
  // Stripe substitutes the session id, which is how the confirmation page finds
  // The order for a guest who has no session to scope a lookup by.
  const returnUrl = `${resolveOrigin()}/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`
  const metadata = {
    checkoutId,
    locale: getCurrentLocale(),
    userId: userId ?? "",
    ...toMetaItems(lines),
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    line_items: toLineItems(lines, shippingCost),
    metadata,
    mode: "payment",
    payment_intent_data: { metadata, receipt_email: email },
    return_url: returnUrl,
    ui_mode: "elements",
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

const swapCheckoutInventory = async (oldReservedLines: CheckoutReleaseLine[], items: CartItem[]): Promise<ValidatedCheckoutItem[]> => {
  await releaseInventoryByVariantLines(oldReservedLines)

  try {
    const validatedItems = await validateAndCalculateItems(items)
    await reserveInventoryForItems(validatedItems)

    return validatedItems
  } catch (error) {
    await reserveInventoryByVariantLines(oldReservedLines).catch((restoreError: unknown) => {
      console.error("Failed to restore prior inventory after checkout update validation error:", restoreError)
    })

    throw error
  }
}

interface PersistCheckoutSessionUpdateArgs {
  checkoutId: string
  checkoutValues: CheckoutFormSchema
  email: string
  lines: OrderLine[]
  oldReservedLines: CheckoutReleaseLine[]
  oldSessionId: string
  shippingCost: number
  userId: string | undefined
  validatedItems: ValidatedCheckoutItem[]
}

const persistCheckoutSessionUpdate = async ({
  checkoutId,
  checkoutValues,
  email,
  lines,
  oldReservedLines,
  oldSessionId,
  shippingCost,
  userId,
  validatedItems,
}: PersistCheckoutSessionUpdateArgs) => {
  try {
    await updateCheckoutDelivery(checkoutId, checkoutValues)

    const result = await createStripeSession({ checkoutId, email, lines, shippingCost, userId })

    await repointPayment({
      amount: result.amount,
      newTransactionId: result.sessionId,
      oldTransactionId: oldSessionId,
    })

    await stripe.checkout.sessions.expire(oldSessionId).catch((expireError: unknown) => {
      console.error("Failed to expire previous Checkout Session:", expireError)
    })

    scheduleProductCatalogInvalidation()

    return result
  } catch (error) {
    await releaseInventoryForItems(validatedItems).catch((releaseError: unknown) => {
      console.error("Failed to release inventory after checkout update error:", releaseError)
    })
    await reserveInventoryByVariantLines(oldReservedLines).catch((restoreError: unknown) => {
      console.error("Failed to restore prior inventory after checkout update error:", restoreError)
    })
    console.error("Stripe/DB error during checkout session update:", error)

    throw error
  }
}

export const handleCreateCheckoutSession = async (data: CreateCheckoutSessionInput) => {
  const session = await getRequestSession()
  const userId = session?.user.id
  const { email } = data.checkoutValues

  const validatedItems = await validateAndCalculateItems(data.items)
  const lines = toOrderLines(validatedItems)
  const shippingCost = await resolveShippingCost(data.checkoutValues.deliveryMethod)

  await reserveInventoryForItems(validatedItems)

  try {
    const checkoutId = await createCheckout(data.checkoutValues, userId, email)

    const result = await createStripeSession({ checkoutId, email, lines, shippingCost, userId })

    await createPendingPayment({
      amount: result.amount,
      checkoutId,
      currency: STRIPE_CURRENCY.toUpperCase(),
      provider: "stripe",
      transactionId: result.sessionId,
    })

    scheduleProductCatalogInvalidation()

    return result
  } catch (error) {
    await releaseInventoryForItems(validatedItems).catch((releaseError: unknown) => {
      console.error("Failed to release inventory after checkout error:", releaseError)
    })
    console.error("Stripe/DB error:", error)

    throw error
  }
}

export const handleUpdateCheckoutSession = async (data: UpdateCheckoutSessionInput) => {
  const context = await getPaymentContextByTransactionId(data.sessionId)
  if (context === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND)
  }

  if (context.userId !== undefined) {
    const session = await getRequestSession()
    if (session?.user.id !== context.userId) {
      throw new AppError(ERROR_CODES.FORBIDDEN)
    }
  }

  const oldStripeSession = await stripe.checkout.sessions.retrieve(data.sessionId)
  const oldReservedLines = parseCheckoutSessionReleaseLines(readCheckoutSessionItemsJson(oldStripeSession.metadata))
  const validatedItems = await swapCheckoutInventory(oldReservedLines, data.items)
  const lines = toOrderLines(validatedItems)
  const shippingCost = await resolveShippingCost(data.checkoutValues.deliveryMethod)

  return persistCheckoutSessionUpdate({
    checkoutId: context.checkoutId,
    checkoutValues: data.checkoutValues,
    email: data.checkoutValues.email,
    lines,
    oldReservedLines,
    oldSessionId: data.sessionId,
    shippingCost,
    userId: context.userId,
    validatedItems,
  })
}

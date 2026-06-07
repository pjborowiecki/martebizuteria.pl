import { getRequestHeader, getRequestHeaders } from "@tanstack/react-start/server";
import type { z } from "zod";

import { CONSTANTS } from "~/src/constants";

import { auth } from "~/src/integrations/better-auth/auth._server";
import type {
  cartItemSchema,
  CreateCheckoutSessionInput,
  UpdateCheckoutSessionInput
} from "~/src/integrations/stripe/stripe.actions.schemas";
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors";
import { stripe } from "~/src/integrations/stripe/stripe.server";

import { isSellPriceCentsValid } from "~/src/lib/_utils/currency";
import { getCurrentLocale } from "~/src/lib/_utils/locale";
import { getBaseURL, resolveAssetURL } from "~/src/lib/_utils/url";
import { scheduleProductCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server";

import { parseCheckoutSessionReleaseLines, type CheckoutReleaseLine } from "~/src/modules/checkout/checkout-metadata.zod";
import { checkoutMutations } from "~/src/modules/checkout/checkout.mutations";
import type { CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod";
import { deliveryMethodAccessors } from "~/src/modules/delivery-method/delivery-method.accessors";
import { inventoryAccessors } from "~/src/modules/inventory/inventory.accessors";
import { reserveInventoryByVariantLines, reserveInventoryForItems } from "~/src/modules/inventory/inventory.utils";
import { paymentAccessors } from "~/src/modules/payment/payment.accessors";
import { productAccessors } from "~/src/modules/product/product.accessors";

const EMPTY_VARIANTS_COUNT = 0;

const NO_COST = 0;

const SHIPPING_QUANTITY = 1;
const SHIPPING_LABEL = "Shipping";

const CLIENT_SECRET_MISSING = "Failed to create Checkout Session: client_secret is missing";

type CartItem = z.infer<typeof cartItemSchema>;

interface OrderLine {
  handle: string;
  imageUrl: string;
  priceCents: number;
  qty: number;
  title: string;
  variantId: string;
}

interface SessionLineItem {
  price_data: { currency: string; product_data: { name: string }; unit_amount: number };
  quantity: number;
}

type ResolvedProducts = Awaited<ReturnType<typeof productAccessors.getProductsWithInventoryByHandles>>;
type ResolvedProduct = ResolvedProducts[number];
type ResolvedVariant = ResolvedProduct["variants"][number];

async function resolveShippingCost(deliveryMethodId: string): Promise<number> {
  if (deliveryMethodId === "") {
    return NO_COST;
  }
  const method = await deliveryMethodAccessors.getActiveDeliveryMethodByIdQuery(deliveryMethodId);
  return method?.price ?? NO_COST;
}

function resolveVariant(products: ResolvedProducts, item: CartItem): { product: ResolvedProduct; variant: ResolvedVariant } {
  const product = products.find((p) => p.handle === item.slug);
  if (product === undefined || product.variants.length === EMPTY_VARIANTS_COUNT) {
    throw new Error(CHECKOUT_ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const variant = product.variants.find((v) => v.id === item.variantId);
  if (variant === undefined) {
    throw new Error(CHECKOUT_ERROR_CODES.VARIANT_NOT_FOUND);
  }

  if (!isSellPriceCentsValid(variant.price)) {
    throw new Error(CHECKOUT_ERROR_CODES.INVALID_PRICE);
  }

  return { product, variant };
}

async function validateAndCalculateItems(items: CartItem[]) {
  const products = await productAccessors.getProductsWithInventoryByHandles(items.map((i) => i.slug));

  return items.map((item) => {
    const { product, variant } = resolveVariant(products, item);

    const inv = variant.inventory;
    if (inv === null || inv.quantityAvailable < item.qty) {
      throw new Error(CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY);
    }

    return {
      ...item,
      currentVersion: inv.version,
      inventoryId: inv.id,
      lineTitle: item.variantTitle === "" ? item.title : `${item.title} — ${item.variantTitle}`,
      priceCents: variant.price,
      productId: product.id,
      variantId: variant.id,
      variantTitle: variant.title
    };
  });
}

function toLineItems(lines: OrderLine[], shippingCost: number): SessionLineItem[] {
  const currency = CONSTANTS.STRIPE_CURRENCY;
  const lineItems: SessionLineItem[] = lines.map((line) => ({
    price_data: { currency, product_data: { name: line.title }, unit_amount: line.priceCents },
    quantity: line.qty
  }));

  if (shippingCost > NO_COST) {
    lineItems.push({
      price_data: { currency, product_data: { name: SHIPPING_LABEL }, unit_amount: shippingCost },
      quantity: SHIPPING_QUANTITY
    });
  }

  return lineItems;
}

function toMetaItems(lines: OrderLine[]): string {
  return JSON.stringify(
    lines.map((line) => ({
      handle: line.handle,
      imageUrl: line.imageUrl,
      price: line.priceCents,
      qty: line.qty,
      title: line.title,
      variantId: line.variantId
    }))
  );
}

function resolveOrigin(): string {
  const origin = getRequestHeader("origin");
  if (origin !== undefined && origin !== "") {
    return origin;
  }
  const referer = getRequestHeader("referer");
  if (referer !== undefined && referer !== "") {
    try {
      return new URL(referer).origin;
    } catch {
      return getBaseURL();
    }
  }
  return getBaseURL();
}

interface CreateSessionArgs {
  checkoutId: string;
  email: string;
  lines: OrderLine[];
  shippingCost: number;
  userId: string | undefined;
}

async function createStripeSession({ checkoutId, email, lines, shippingCost, userId }: CreateSessionArgs) {
  const returnUrl = `${resolveOrigin()}/checkout?success=true`;
  const metadata = {
    checkoutId,
    items: toMetaItems(lines),
    locale: getCurrentLocale(),
    userId: userId ?? ""
  };

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    line_items: toLineItems(lines, shippingCost),
    metadata,
    mode: "payment",
    payment_intent_data: { metadata, receipt_email: email },
    return_url: returnUrl,
    ui_mode: "elements"
  });

  if (typeof session.client_secret !== "string") {
    throw new TypeError(CLIENT_SECRET_MISSING);
  }

  const amount = session.amount_total ?? NO_COST;
  return { amount, clientSecret: session.client_secret, sessionId: session.id };
}

type ValidatedCheckoutItem = Awaited<ReturnType<typeof validateAndCalculateItems>>[number];

function toOrderLines(validatedItems: ValidatedCheckoutItem[]): OrderLine[] {
  return validatedItems.map((item) => ({
    handle: item.slug,
    imageUrl: resolveAssetURL(item.image),
    priceCents: item.priceCents,
    qty: item.qty,
    title: item.lineTitle,
    variantId: item.variantId
  }));
}

async function swapCheckoutInventory(oldReservedLines: CheckoutReleaseLine[], items: CartItem[]): Promise<ValidatedCheckoutItem[]> {
  await inventoryAccessors.releaseInventoryByVariantLines(oldReservedLines);

  try {
    const validatedItems = await validateAndCalculateItems(items);
    await reserveInventoryForItems(validatedItems);
    return validatedItems;
  } catch (error) {
    await reserveInventoryByVariantLines(oldReservedLines).catch((restoreError: unknown) => {
      console.error("Failed to restore prior inventory after checkout update validation error:", restoreError);
    });
    throw error;
  }
}

interface PersistCheckoutSessionUpdateArgs {
  checkoutId: string;
  checkoutValues: CheckoutFormSchema;
  email: string;
  lines: OrderLine[];
  oldReservedLines: CheckoutReleaseLine[];
  oldSessionId: string;
  shippingCost: number;
  userId: string | undefined;
  validatedItems: ValidatedCheckoutItem[];
}

async function persistCheckoutSessionUpdate({
  checkoutId,
  checkoutValues,
  email,
  lines,
  oldReservedLines,
  oldSessionId,
  shippingCost,
  userId,
  validatedItems
}: PersistCheckoutSessionUpdateArgs) {
  try {
    await checkoutMutations.updateCheckoutDelivery(checkoutId, checkoutValues);

    const result = await createStripeSession({ checkoutId, email, lines, shippingCost, userId });

    await paymentAccessors.repointPayment({
      amount: result.amount,
      newTransactionId: result.sessionId,
      oldTransactionId: oldSessionId
    });

    await stripe.checkout.sessions.expire(oldSessionId).catch((expireError: unknown) => {
      console.error("Failed to expire previous Checkout Session:", expireError);
    });

    scheduleProductCatalogInvalidation();

    return result;
  } catch (error) {
    await inventoryAccessors.releaseInventoryForItems(validatedItems).catch((releaseError: unknown) => {
      console.error("Failed to release inventory after checkout update error:", releaseError);
    });
    await reserveInventoryByVariantLines(oldReservedLines).catch((restoreError: unknown) => {
      console.error("Failed to restore prior inventory after checkout update error:", restoreError);
    });
    console.error("Stripe/DB error during checkout session update:", error);
    throw error;
  }
}

export async function handleCreateCheckoutSession(data: CreateCheckoutSessionInput) {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  const userId = session?.user?.id;
  const { email } = data.checkoutValues;

  const validatedItems = await validateAndCalculateItems(data.items);
  const lines = toOrderLines(validatedItems);
  const shippingCost = await resolveShippingCost(data.checkoutValues.deliveryMethod);

  await reserveInventoryForItems(validatedItems);

  try {
    const checkoutId = await checkoutMutations.createCheckoutAndAddress(data.checkoutValues, userId, email);

    const result = await createStripeSession({ checkoutId, email, lines, shippingCost, userId });

    await paymentAccessors.createPendingPayment({
      amount: result.amount,
      checkoutId,
      currency: CONSTANTS.STRIPE_CURRENCY.toUpperCase(),
      provider: "stripe",
      transactionId: result.sessionId
    });

    scheduleProductCatalogInvalidation();

    return result;
  } catch (error) {
    await inventoryAccessors.releaseInventoryForItems(validatedItems).catch((releaseError: unknown) => {
      console.error("Failed to release inventory after checkout error:", releaseError);
    });
    console.error("Stripe/DB error:", error);
    throw error;
  }
}

export async function handleUpdateCheckoutSession(data: UpdateCheckoutSessionInput) {
  const context = await paymentAccessors.getPaymentContextByTransactionId(data.sessionId);
  if (context === undefined) {
    throw new Error("No payment found for the provided Checkout Session");
  }

  const oldStripeSession = await stripe.checkout.sessions.retrieve(data.sessionId);
  const oldReservedLines = parseCheckoutSessionReleaseLines(oldStripeSession.metadata?.items ?? "[]");
  const validatedItems = await swapCheckoutInventory(oldReservedLines, data.items);
  const lines = toOrderLines(validatedItems);
  const shippingCost = await resolveShippingCost(data.checkoutValues.deliveryMethod);

  return persistCheckoutSessionUpdate({
    checkoutId: context.checkoutId,
    checkoutValues: data.checkoutValues,
    email: context.email,
    lines,
    oldReservedLines,
    oldSessionId: data.sessionId,
    shippingCost,
    userId: context.userId,
    validatedItems
  });
}

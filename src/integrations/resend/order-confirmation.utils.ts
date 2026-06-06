import { env } from "cloudflare:workers";
import type Stripe from "stripe";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import type { OrderConfirmationDetails, OrderConfirmationItem } from "~/src/integrations/resend/templates/order-confirmation";
import { stripe } from "~/src/integrations/stripe/stripe.server";
import { getMessagesForLocale } from "~/src/integrations/use-intl/i18n.queries";

import { PLACEHOLDER_IMAGE } from "~/src/lib/_utils/image";
import { buildLocalizedUrl } from "~/src/lib/_utils/sitemap";
import { getBaseURL, resolveAssetURL } from "~/src/lib/_utils/url";

import type { FulfillmentLine } from "~/src/modules/checkout/checkout.utils";

interface EmailAddressRow {
  readonly address1: string;
  readonly address2: string | null;
  readonly city: string;
  readonly countryCode: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly phone: string | null;
  readonly postalCode: string | null;
}

export interface CheckoutEmailContext {
  readonly billingAddress: EmailAddressRow | null;
  readonly billingAddressId: string | null;
  readonly customerNote: string | null;
  readonly deliveryMethod: {
    readonly name: string;
    readonly type: "courier" | "locker" | "in_store";
  } | null;
  readonly lockerId: string | null;
  readonly shippingAddress: EmailAddressRow | null;
  readonly shippingAddressId: string | null;
}

const EMPTY_COUNT = 0;

function refId(ref: string | { id: string } | null | undefined): string | undefined {
  if (ref === null || ref === undefined) {
    return undefined;
  }

  return typeof ref === "string" ? ref : ref.id;
}

export function formatEmailAddress(addressRow: EmailAddressRow | null | undefined): string | undefined {
  if (addressRow === null || addressRow === undefined) {
    return undefined;
  }

  const name = [addressRow.firstName, addressRow.lastName].filter((part) => part !== null && part !== "").join(" ");
  const locality = [addressRow.postalCode, addressRow.city].filter((part) => part !== null && part !== "").join(" ");
  const lines = [name, addressRow.address1, addressRow.address2, locality, addressRow.countryCode, addressRow.phone].filter(
    (line): line is string => typeof line === "string" && line.trim() !== ""
  );

  return lines.length === EMPTY_COUNT ? undefined : lines.join("\n");
}

function resolveDeliveryMethodLabel(context: CheckoutEmailContext | undefined, locale: Locale): string {
  const { unavailable } = getMessagesForLocale(locale).emails.orderConfirmation;
  const method = context?.deliveryMethod;

  if (method === null || method === undefined) {
    return unavailable;
  }

  const lockerId = context?.lockerId?.trim();
  if (method.type === "locker" && lockerId !== undefined && lockerId !== "") {
    return `${method.name} · ${lockerId}`;
  }

  return method.name;
}

function resolveDeliveryTiming(
  deliveryType: "courier" | "locker" | "in_store",
  locale: Locale
): { estimatedDelivery: string; fulfillmentTime: string } {
  const timing = getMessagesForLocale(locale).emails.orderConfirmation.deliveryTiming;
  return timing[deliveryType];
}

function resolveBillingAddress(context: CheckoutEmailContext | undefined, locale: Locale): string {
  const t = getMessagesForLocale(locale).emails.orderConfirmation;

  if (context === undefined) {
    return t.unavailable;
  }

  if (context.billingAddressId !== null && context.billingAddressId === context.shippingAddressId) {
    return t.billingSameAsShipping;
  }

  return formatEmailAddress(context.billingAddress) ?? t.unavailable;
}

export function buildOrderConfirmationDetails(
  context: CheckoutEmailContext | undefined,
  locale: Locale,
  paymentMethod: string
): OrderConfirmationDetails {
  const t = getMessagesForLocale(locale).emails.orderConfirmation;
  const deliveryType = context?.deliveryMethod?.type ?? "courier";
  const { estimatedDelivery, fulfillmentTime } = resolveDeliveryTiming(deliveryType, locale);

  return {
    billingAddress: resolveBillingAddress(context, locale),
    deliveryMethod: resolveDeliveryMethodLabel(context, locale),
    estimatedDelivery,
    fulfillmentTime,
    paymentMethod,
    shippingAddress: formatEmailAddress(context?.shippingAddress) ?? t.unavailable
  };
}

export interface OrderAccountCta {
  readonly href: string;
  readonly isGuest: boolean;
  readonly label: string;
}

function resolveAppUrl(): string {
  if (typeof env.VITE_APP_URL === "string" && env.VITE_APP_URL !== "") {
    return env.VITE_APP_URL.replace(/\/$/u, "");
  }

  return getBaseURL().replace(/\/$/u, "");
}

function resolveProductUrl(appUrl: string, locale: Locale, handle: string | undefined): string {
  const productPath =
    handle !== undefined && handle !== "" ? CONSTANTS.ROUTES.PRODUCT.replace("$handle", handle) : CONSTANTS.ROUTES.PRODUCTS;

  return buildLocalizedUrl(appUrl, productPath, locale);
}

export function buildOrderConfirmationItems(lines: readonly FulfillmentLine[], locale: Locale): OrderConfirmationItem[] {
  const appUrl = resolveAppUrl();

  return lines.map((line) => ({
    imageUrl: line.imageUrl !== undefined && line.imageUrl !== "" ? resolveAssetURL(line.imageUrl) : PLACEHOLDER_IMAGE,
    price: line.price,
    productUrl: resolveProductUrl(appUrl, locale, line.handle),
    qty: line.qty,
    title: line.title
  }));
}

export function buildOrderAccountCta(locale: Locale, orderId: string, isGuest: boolean): OrderAccountCta {
  const appUrl = resolveAppUrl();
  const t = getMessagesForLocale(locale).emails.orderConfirmation;

  if (isGuest) {
    return {
      href: buildLocalizedUrl(appUrl, CONSTANTS.ROUTES.AUTH_SIGN_UP, locale),
      isGuest: true,
      label: t.createAccountCta
    };
  }

  const orderPath = CONSTANTS.ROUTES.ACCOUNT_ORDER.replace("$id", orderId);

  return {
    href: buildLocalizedUrl(appUrl, orderPath, locale),
    isGuest: false,
    label: t.viewOrderCta
  };
}

export async function resolveStripePaymentMethodLabel(session: Stripe.Checkout.Session, locale: Locale): Promise<string> {
  const labels = getMessagesForLocale(locale).emails.orderConfirmation.paymentMethods;
  const fallback = getMessagesForLocale(locale).emails.orderConfirmation.paymentMethodUnknown;
  const paymentIntentId = refId(session.payment_intent);

  if (paymentIntentId === undefined) {
    return fallback;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["payment_method"] });
    const paymentMethod = paymentIntent.payment_method;

    if (paymentMethod === null || typeof paymentMethod === "string") {
      return fallback;
    }

    if (paymentMethod.type === "card") {
      return labels.card;
    }

    if (paymentMethod.type === "blik") {
      return labels.blik;
    }

    if (paymentMethod.type === "p24") {
      return labels.p24;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

import type { Locale } from "~/src/constants/types";

import {
  buildOrderAccountCta,
  type CheckoutEmailContext,
  type OrderAccountCta,
  formatEmailAddress
} from "~/src/integrations/resend/order-confirmation.utils";
import type { OrderShippedDetails } from "~/src/integrations/resend/templates/order-shipped";
import { getMessagesForLocale } from "~/src/integrations/use-intl/i18n.queries";

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

function resolveEstimatedDelivery(deliveryType: "courier" | "in_store" | "locker", locale: Locale): string {
  return getMessagesForLocale(locale).emails.orderConfirmation.deliveryTiming[deliveryType].estimatedDelivery;
}

export function buildOrderShippedDetails(context: CheckoutEmailContext | undefined, locale: Locale): OrderShippedDetails {
  const t = getMessagesForLocale(locale).emails.orderConfirmation;
  const deliveryType = context?.deliveryMethod?.type ?? "courier";

  return {
    deliveryMethod: resolveDeliveryMethodLabel(context, locale),
    estimatedDelivery: resolveEstimatedDelivery(deliveryType, locale),
    shippingAddress: formatEmailAddress(context?.shippingAddress) ?? t.unavailable
  };
}

export function buildOrderShippedAccountCta(locale: Locale, orderId: string, userId: string | null | undefined): OrderAccountCta {
  return buildOrderAccountCta(locale, orderId, userId === null || userId === undefined || userId === "");
}

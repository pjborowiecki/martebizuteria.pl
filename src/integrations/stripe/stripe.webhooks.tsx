import type StripeType from "stripe";
import { z } from "zod";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { getOrderConfirmationSubject, OrderConfirmation } from "~/src/integrations/resend/templates/order-confirmation";
import { stripe } from "~/src/integrations/stripe/stripe.server";

import { sendEmail } from "~/src/lib/_utils/email";
import { isValidLocale } from "~/src/lib/_utils/locale";

import { checkoutAccessors } from "~/src/modules/checkout/checkout.accessors";
import { orderAccessors } from "~/src/modules/order/order.accessors";

const NO_AMOUNT = 0;
const SINGLE_RESULT = 1;
const DISPUTE_LOST = "lost";

/** A Stripe ref that may arrive expanded or as a bare id. Returns its id, or `undefined`. */
function refId(ref: string | { id: string } | null): string | undefined {
  if (ref === null) {
    return undefined;
  }
  return typeof ref === "string" ? ref : ref.id;
}

/**
 * Refunds and disputes reference the Charge/PaymentIntent, but our `payment`
 * rows are keyed by the Checkout Session id. This bridges the two by asking
 * Stripe which session owns the PaymentIntent.
 */
async function resolveTransactionId(paymentIntent: string | { id: string } | null): Promise<string | undefined> {
  const paymentIntentId = refId(paymentIntent);
  if (paymentIntentId === undefined) {
    return undefined;
  }

  const sessions = await stripe.checkout.sessions.list({
    limit: SINGLE_RESULT,
    payment_intent: paymentIntentId
  });
  const [session] = sessions.data;
  return session?.id;
}

const FULFILLABLE_PAYMENT_STATUSES = new Set<StripeType.Checkout.Session["payment_status"]>(["no_payment_required", "paid"]);

const fulfillmentItemsSchema = z.array(z.object({ price: z.number(), qty: z.number(), title: z.string(), variantId: z.string() }));
const releaseItemsSchema = z.array(z.object({ qty: z.number(), variantId: z.string() }).loose());

type FulfillmentLines = z.infer<typeof fulfillmentItemsSchema>;

function parseMetadataItems(session: StripeType.Checkout.Session): string {
  return session.metadata?.items ?? "[]";
}

function resolveLocale(session: StripeType.Checkout.Session): Locale {
  const raw = session.metadata?.locale;
  return typeof raw === "string" && isValidLocale(raw) ? raw : CONSTANTS.DEFAULT_LOCALE;
}

/** Emails the buyer their order confirmation. Best-effort: a failed send is logged, never thrown. */
async function notifyOrderConfirmed(
  session: StripeType.Checkout.Session,
  order: Readonly<{ currency: string; lines: FulfillmentLines; orderId: string }>
): Promise<void> {
  const email = session.customer_email ?? session.customer_details?.email;
  if (email === null || email === undefined || email === "") {
    return;
  }

  const locale = resolveLocale(session);
  const [response, error] = await sendEmail({
    react: (
      <OrderConfirmation
        currency={order.currency}
        items={order.lines}
        locale={locale}
        orderId={order.orderId}
        total={session.amount_total ?? NO_AMOUNT}
      />
    ),
    subject: getOrderConfirmationSubject(locale),
    to: email
  });

  if (error !== undefined) {
    console.error(`Order confirmation email failed for ${order.orderId}:`, error);
  } else if (response !== undefined && response.error !== null) {
    console.error(`Order confirmation email rejected for ${order.orderId}: ${response.error.message}`);
  }
}

async function handleFulfillCheckoutSession(session: StripeType.Checkout.Session): Promise<void> {
  if (!FULFILLABLE_PAYMENT_STATUSES.has(session.payment_status)) {
    console.info(`Session ${session.id} completed with payment_status=${session.payment_status}; awaiting async settlement.`);
    return;
  }

  const lines = fulfillmentItemsSchema.parse(JSON.parse(parseMetadataItems(session)));
  const currency = (session.currency ?? CONSTANTS.STRIPE_CURRENCY).toUpperCase();
  const orderId = await checkoutAccessors.fulfillCheckout({
    amount: session.amount_total ?? NO_AMOUNT,
    currency,
    lines,
    transactionId: session.id
  });

  // `fulfillCheckout` is idempotent: a defined orderId means THIS event created
  // the order, so the confirmation email is sent exactly once.
  if (orderId === undefined) {
    return;
  }
  console.info(`Checkout converted to Order ${orderId} from session ${session.id}.`);

  await notifyOrderConfirmed(session, { currency, lines, orderId });
}

async function handleReleaseCheckoutSession(session: StripeType.Checkout.Session): Promise<void> {
  const lines = releaseItemsSchema.parse(JSON.parse(parseMetadataItems(session)));
  await checkoutAccessors.releaseCheckout({ lines, transactionId: session.id });
  console.info(`Checkout released after failed/expired session ${session.id}.`);
}

/**
 * A card decline keeps the Checkout Session open and retryable, so this is NOT
 * a terminal state: we deliberately do NOT release inventory here (that would
 * free stock while the shopper is mid-retry). Reservations are reclaimed when
 * the session ends — `checkout.session.expired` / `async_payment_failed`. We
 * handle the event purely for observability / support follow-up.
 */
function handlePaymentIntentFailed(paymentIntent: StripeType.PaymentIntent): Promise<void> {
  const reason = paymentIntent.last_payment_error?.message ?? "unknown";
  console.warn(`Payment failed for intent ${paymentIntent.id} (checkout ${paymentIntent.metadata.checkoutId ?? "?"}): ${reason}`);
  return Promise.resolve();
}

async function handleChargeRefunded(charge: StripeType.Charge): Promise<void> {
  const transactionId = await resolveTransactionId(charge.payment_intent);
  if (transactionId === undefined) {
    console.info(`Charge ${charge.id} refunded but no Checkout Session resolved; skipping.`);
    return;
  }

  await orderAccessors.refundOrder({
    fullyRefunded: charge.amount_refunded >= charge.amount,
    refundedAmount: charge.amount_refunded,
    restock: true,
    transactionId
  });
  console.info(`Recorded refund of ${charge.amount_refunded} for charge ${charge.id}.`);
}

async function handleChargeDisputeCreated(dispute: StripeType.Dispute): Promise<void> {
  const transactionId = await resolveTransactionId(dispute.payment_intent);
  if (transactionId === undefined) {
    console.warn(`Dispute ${dispute.id} created but no Checkout Session resolved; skipping.`);
    return;
  }

  await orderAccessors.flagOrderDispute(transactionId, {
    amount: dispute.amount,
    id: dispute.id,
    reason: dispute.reason,
    status: dispute.status
  });
  console.warn(`Dispute ${dispute.id} (${dispute.reason}) opened; order frozen pending resolution.`);
}

async function handleChargeDisputeClosed(dispute: StripeType.Dispute): Promise<void> {
  const transactionId = await resolveTransactionId(dispute.payment_intent);
  if (transactionId === undefined) {
    console.info(`Dispute ${dispute.id} closed but no Checkout Session resolved; skipping.`);
    return;
  }

  // A lost dispute is a forced reversal of funds: record it as a refund, but do
  // NOT restock — the goods were almost certainly shipped and not returned.
  if (dispute.status === DISPUTE_LOST) {
    await orderAccessors.refundOrder({
      fullyRefunded: true,
      refundedAmount: dispute.amount,
      restock: false,
      transactionId
    });
    console.warn(`Dispute ${dispute.id} lost; order marked refunded — review inventory manually.`);
    return;
  }

  await orderAccessors.clearOrderDispute(transactionId);
  console.info(`Dispute ${dispute.id} closed (${dispute.status}); dispute flag cleared.`);
}

export const webhookHandlers: Record<string, (event: StripeType.Event) => Promise<void>> = {
  [CONSTANTS.STRIPE_WEBHOOK_EVENTS.CHARGE_DISPUTE_CLOSED]: async (event) => {
    await handleChargeDisputeClosed(z.custom<StripeType.Dispute>().parse(event.data.object));
  },
  [CONSTANTS.STRIPE_WEBHOOK_EVENTS.CHARGE_DISPUTE_CREATED]: async (event) => {
    await handleChargeDisputeCreated(z.custom<StripeType.Dispute>().parse(event.data.object));
  },
  [CONSTANTS.STRIPE_WEBHOOK_EVENTS.CHARGE_REFUNDED]: async (event) => {
    await handleChargeRefunded(z.custom<StripeType.Charge>().parse(event.data.object));
  },
  [CONSTANTS.STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_ASYNC_PAYMENT_FAILED]: async (event) => {
    await handleReleaseCheckoutSession(z.custom<StripeType.Checkout.Session>().parse(event.data.object));
  },
  [CONSTANTS.STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_ASYNC_PAYMENT_SUCCEEDED]: async (event) => {
    await handleFulfillCheckoutSession(z.custom<StripeType.Checkout.Session>().parse(event.data.object));
  },
  [CONSTANTS.STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_COMPLETED]: async (event) => {
    await handleFulfillCheckoutSession(z.custom<StripeType.Checkout.Session>().parse(event.data.object));
  },
  [CONSTANTS.STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_EXPIRED]: async (event) => {
    await handleReleaseCheckoutSession(z.custom<StripeType.Checkout.Session>().parse(event.data.object));
  },
  [CONSTANTS.STRIPE_WEBHOOK_EVENTS.PAYMENT_INTENT_PAYMENT_FAILED]: async (event) => {
    await handlePaymentIntentFailed(z.custom<StripeType.PaymentIntent>().parse(event.data.object));
  }
};

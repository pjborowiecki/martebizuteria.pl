import type Stripe from "stripe"

import { STRIPE_API_VERSION, STRIPE_WEBHOOK_EVENTS } from "~/src/integrations/stripe/stripe.constants"

const EVENT_CREATED_AT = 1_700_000_000

const EVENT_BASE: Omit<Stripe.EventBase, "data" | "type"> = {
  api_version: STRIPE_API_VERSION,
  created: EVENT_CREATED_AT,
  id: "evt_test_1",
  livemode: false,
  object: "event",
  pending_webhooks: 0,
  request: null,
}

export const checkoutSession = ({
  amountTotal = null,
  currency = "pln",
  customerDetails = null,
  customerEmail = null,
  id = "cs_test_1",
  metadata = null,
  paymentIntent = null,
  paymentStatus = "paid",
}: Readonly<{
  amountTotal?: number | null
  currency?: string | null
  customerDetails?: Stripe.Checkout.Session.CustomerDetails | null
  customerEmail?: string | null
  id?: string
  metadata?: Stripe.Metadata | null
  paymentIntent?: string | null
  paymentStatus?: Stripe.Checkout.Session["payment_status"]
}>): Stripe.Checkout.Session => ({
  adaptive_pricing: null,
  after_expiration: null,
  allow_promotion_codes: null,
  amount_subtotal: amountTotal,
  amount_total: amountTotal,
  automatic_tax: { enabled: false, liability: null, provider: null, status: null },
  billing_address_collection: null,
  cancel_url: null,
  client_reference_id: null,
  client_secret: null,
  collected_information: null,
  consent: null,
  consent_collection: null,
  created: EVENT_CREATED_AT,
  currency,
  currency_conversion: null,
  custom_fields: [],
  custom_text: { after_submit: null, shipping_address: null, submit: null, terms_of_service_acceptance: null },
  customer: null,
  customer_account: null,
  customer_creation: null,
  customer_details: customerDetails,
  customer_email: customerEmail,
  discounts: null,
  expires_at: EVENT_CREATED_AT,
  id,
  integration_identifier: null,
  invoice: null,
  invoice_creation: null,
  livemode: false,
  locale: null,
  managed_payments: null,
  metadata,
  mode: "payment",
  object: "checkout.session",
  origin_context: null,
  payment_intent: paymentIntent,
  payment_link: null,
  payment_method_collection: null,
  payment_method_configuration_details: null,
  payment_method_options: null,
  payment_method_types: ["card"],
  payment_status: paymentStatus,
  permissions: null,
  recovered_from: null,
  saved_payment_method_options: null,
  setup_intent: null,
  shipping_address_collection: null,
  shipping_cost: null,
  shipping_options: [],
  status: "complete",
  submit_type: null,
  subscription: null,
  success_url: null,
  total_details: null,
  ui_mode: null,
  url: null,
  wallet_options: null,
})

export const charge = ({
  amount,
  amountRefunded,
  id = "ch_test_1",
  paymentIntent,
}: Readonly<{
  amount: number
  amountRefunded: number
  id?: string
  paymentIntent: string | null
}>): Stripe.Charge => ({
  amount,
  amount_captured: amount,
  amount_refunded: amountRefunded,
  application: null,
  application_fee: null,
  application_fee_amount: null,
  balance_transaction: null,
  billing_details: { address: null, email: null, name: null, phone: null, tax_id: null },
  calculated_statement_descriptor: null,
  captured: true,
  created: EVENT_CREATED_AT,
  currency: "pln",
  customer: null,
  description: null,
  disputed: false,
  failure_balance_transaction: null,
  failure_code: null,
  failure_message: null,
  fraud_details: null,
  id,
  livemode: false,
  metadata: {},
  object: "charge",
  on_behalf_of: null,
  outcome: null,
  paid: true,
  payment_intent: paymentIntent,
  payment_method: null,
  payment_method_details: null,
  receipt_email: null,
  receipt_number: null,
  receipt_url: null,
  refunded: false,
  review: null,
  shipping: null,
  source: null,
  source_transfer: null,
  statement_descriptor: null,
  statement_descriptor_suffix: null,
  status: "succeeded",
  transfer_data: null,
  transfer_group: null,
})

export const dispute = ({
  amount,
  id = "dp_test_1",
  paymentIntent,
  reason = "fraudulent",
  status,
}: Readonly<{
  amount: number
  id?: string
  paymentIntent: string | null
  reason?: string
  status: Stripe.Dispute.Status
}>): Stripe.Dispute => ({
  amount,
  balance_transactions: [],
  charge: "ch_test_1",
  created: EVENT_CREATED_AT,
  currency: "pln",
  enhanced_eligibility_types: [],
  evidence: {
    access_activity_log: null,
    billing_address: null,
    cancellation_policy: null,
    cancellation_policy_disclosure: null,
    cancellation_rebuttal: null,
    customer_communication: null,
    customer_email_address: null,
    customer_name: null,
    customer_purchase_ip: null,
    customer_signature: null,
    duplicate_charge_documentation: null,
    duplicate_charge_explanation: null,
    duplicate_charge_id: null,
    enhanced_evidence: {},
    product_description: null,
    receipt: null,
    refund_policy: null,
    refund_policy_disclosure: null,
    refund_refusal_explanation: null,
    service_date: null,
    service_documentation: null,
    shipping_address: null,
    shipping_carrier: null,
    shipping_date: null,
    shipping_documentation: null,
    shipping_tracking_number: null,
    uncategorized_file: null,
    uncategorized_text: null,
  },
  evidence_details: { due_by: null, enhanced_eligibility: {}, has_evidence: false, past_due: false, submission_count: 0 },
  id,
  is_charge_refundable: false,
  livemode: false,
  metadata: {},
  object: "dispute",
  payment_intent: paymentIntent,
  reason,
  status,
})

export const paymentIntent = ({
  checkoutId,
  failureMessage,
  id = "pi_test_1",
}: Readonly<{
  checkoutId?: string
  failureMessage?: string
  id?: string
}>): Stripe.PaymentIntent => ({
  allowed_payment_method_types: null,
  amount: 0,
  amount_capturable: 0,
  amount_received: 0,
  application: null,
  application_fee_amount: null,
  automatic_payment_methods: null,
  canceled_at: null,
  cancellation_reason: null,
  capture_method: "automatic",
  client_secret: null,
  confirmation_method: "automatic",
  created: EVENT_CREATED_AT,
  currency: "pln",
  customer: null,
  customer_account: null,
  description: null,
  excluded_payment_method_types: null,
  id,
  last_payment_error: failureMessage === undefined ? null : { message: failureMessage, type: "card_error" },
  latest_charge: null,
  livemode: false,
  managed_payments: null,
  metadata: checkoutId === undefined ? {} : { checkoutId },
  next_action: null,
  object: "payment_intent",
  on_behalf_of: null,
  payment_method: null,
  payment_method_configuration_details: null,
  payment_method_options: null,
  payment_method_types: ["card"],
  processing: null,
  receipt_email: null,
  review: null,
  setup_future_usage: null,
  shipping: null,
  source: null,
  statement_descriptor: null,
  statement_descriptor_suffix: null,
  status: "requires_payment_method",
  transfer_group: null,
})

export const checkoutSessionCompletedEvent = (session: Stripe.Checkout.Session): Stripe.CheckoutSessionCompletedEvent => ({
  ...EVENT_BASE,
  data: { object: session },
  type: STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_COMPLETED,
})

export const checkoutSessionExpiredEvent = (session: Stripe.Checkout.Session): Stripe.CheckoutSessionExpiredEvent => ({
  ...EVENT_BASE,
  data: { object: session },
  type: STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_EXPIRED,
})

export const chargeRefundedEvent = (refundedCharge: Stripe.Charge): Stripe.ChargeRefundedEvent => ({
  ...EVENT_BASE,
  data: { object: refundedCharge },
  type: STRIPE_WEBHOOK_EVENTS.CHARGE_REFUNDED,
})

export const chargeDisputeCreatedEvent = (createdDispute: Stripe.Dispute): Stripe.ChargeDisputeCreatedEvent => ({
  ...EVENT_BASE,
  data: { object: createdDispute },
  type: STRIPE_WEBHOOK_EVENTS.CHARGE_DISPUTE_CREATED,
})

export const chargeDisputeClosedEvent = (closedDispute: Stripe.Dispute): Stripe.ChargeDisputeClosedEvent => ({
  ...EVENT_BASE,
  data: { object: closedDispute },
  type: STRIPE_WEBHOOK_EVENTS.CHARGE_DISPUTE_CLOSED,
})

export const paymentIntentFailedEvent = (intent: Stripe.PaymentIntent): Stripe.PaymentIntentPaymentFailedEvent => ({
  ...EVENT_BASE,
  data: { object: intent },
  type: STRIPE_WEBHOOK_EVENTS.PAYMENT_INTENT_PAYMENT_FAILED,
})

export const checkoutSessionAsyncPaymentSucceededEvent = (
  session: Stripe.Checkout.Session,
): Stripe.CheckoutSessionAsyncPaymentSucceededEvent => ({
  ...EVENT_BASE,
  data: { object: session },
  type: STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_ASYNC_PAYMENT_SUCCEEDED,
})

export const checkoutSessionAsyncPaymentFailedEvent = (
  session: Stripe.Checkout.Session,
): Stripe.CheckoutSessionAsyncPaymentFailedEvent => ({
  ...EVENT_BASE,
  data: { object: session },
  type: STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_ASYNC_PAYMENT_FAILED,
})

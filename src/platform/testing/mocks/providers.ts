import { z } from "zod"

import { STRIPE_API_VERSION, STRIPE_CURRENCY } from "~/src/integrations/stripe/stripe.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

const nativeFetch = globalThis.fetch

const recipientsSchema = z.array(z.string())

const resendEmailSchema = z.object({
  from: z.string(),
  html: z.string(),
  subject: z.string(),
  to: z.union([z.string(), recipientsSchema]),
})

const stripeAmountSchema = z.coerce.number().int()

const stripeMetadataSchema = z.record(z.string(), z.string()).default({})

const stripeDiscountSchema = z.object({ coupon: z.string() })

const stripeLineItemSchema = z.object({
  price_data: z.object({ unit_amount: stripeAmountSchema }),
  quantity: stripeAmountSchema,
})

const stripeSessionParamsSchema = z.object({
  customer: z.string().optional(),
  customer_email: z.string().optional(),
  discounts: z.record(z.string(), stripeDiscountSchema).default({}),
  line_items: z.record(z.string(), stripeLineItemSchema),
  metadata: stripeMetadataSchema,
  return_url: z.string(),
})

const stripeCouponParamsSchema = z.object({
  amount_off: stripeAmountSchema,
  currency: z.string(),
  metadata: stripeMetadataSchema,
  name: z.string(),
})

const stripeCustomerParamsSchema = z.object({
  email: z.string(),
  metadata: stripeMetadataSchema,
  name: z.string().optional(),
})

const stripeRefundParamsSchema = z.object({
  amount: stripeAmountSchema.optional(),
  payment_intent: z.string(),
})

export interface CapturedEmail {
  readonly from: string
  readonly html: string
  readonly id: string
  readonly subject: string
  readonly to: readonly string[]
}

interface EmulatedCheckoutSession {
  readonly amount_subtotal: number
  readonly amount_total: number
  readonly client_secret: string
  readonly created: number
  readonly currency: string
  readonly customer: string | null
  readonly customer_details: { readonly email: string | null }
  readonly customer_email: string | null
  readonly id: string
  readonly livemode: false
  readonly metadata: Readonly<Record<string, string>>
  readonly mode: "payment"
  readonly object: "checkout.session"
  readonly payment_intent: string | null
  readonly payment_status: "paid" | "unpaid"
  readonly return_url: string
  readonly status: "complete" | "expired" | "open"
  readonly ui_mode: "elements"
}

interface EmulatedCoupon {
  readonly amount_off: number
  readonly currency: string
  readonly duration: "once"
  readonly id: string
  readonly metadata: Readonly<Record<string, string>>
  readonly name: string
  readonly object: "coupon"
  readonly valid: true
}

interface EmulatedCustomer {
  readonly email: string
  readonly id: string
  readonly metadata: Readonly<Record<string, string>>
  readonly name: string | null
  readonly object: "customer"
}

const sentEmails: CapturedEmail[] = []
const checkoutSessions = new Map<string, EmulatedCheckoutSession>()
const coupons = new Map<string, EmulatedCoupon>()
const customers = new Map<string, EmulatedCustomer>()
const paymentIntents = new Map<string, Readonly<Record<string, unknown>>>()

const stripeId = (prefix: string): string => `${prefix}_test_${crypto.randomUUID().replaceAll("-", "")}`

const nowInSeconds = (): number => Math.floor(Date.now() / 1000)

export const getSentEmails = (recipient: string): CapturedEmail[] => sentEmails.filter(({ to }) => to.includes(recipient))

export const listCheckoutSessions = (email: string): EmulatedCheckoutSession[] =>
  [...checkoutSessions.values()].filter((session) => session.customer_details.email === email)

const captureEmail = async (request: Request): Promise<Response> => {
  const payload = resendEmailSchema.parse(await request.json())
  const id = crypto.randomUUID()
  sentEmails.push({
    from: payload.from,
    html: payload.html,
    id,
    subject: payload.subject,
    to: typeof payload.to === "string" ? [payload.to] : payload.to,
  })

  return Response.json({ id })
}

interface CheckoutSessionRequest {
  readonly action: string | undefined
  readonly form: StripeForm
  readonly method: string
  readonly sessionId: string | undefined
  readonly url: URL
}

interface StripeForm {
  [key: string]: StripeForm | string
}

const parseStripeForm = (body: string): StripeForm => {
  const root: StripeForm = {}
  for (const [key, value] of new URLSearchParams(body)) {
    const path = key.replaceAll("]", "").split("[")
    const leaf = path.pop() ?? key
    let node = root
    for (const segment of path) {
      const child = node[segment]
      if (typeof child === "object") {
        node = child
      } else {
        const created: StripeForm = {}
        node[segment] = created
        node = created
      }
    }
    node[leaf] = value
  }

  return root
}

const stripeError = (message: string, status: number = HTTP_STATUS.BAD_REQUEST): Response =>
  Response.json({ error: { message, type: "invalid_request_error" } }, { status })

const stripeList = (url: URL, data: readonly unknown[]): Response =>
  Response.json({ data, has_more: false, object: "list", url: url.pathname })

const createCheckoutSession = (form: StripeForm): Response => {
  const params = stripeSessionParamsSchema.parse(form)
  const subtotal = Object.values(params.line_items).reduce((sum, line) => sum + line.price_data.unit_amount * line.quantity, 0)
  const discount = Object.values(params.discounts).reduce((sum, { coupon }) => sum + (coupons.get(coupon)?.amount_off ?? 0), 0)
  const customerEmail = params.customer === undefined ? params.customer_email : customers.get(params.customer)?.email
  const id = stripeId("cs")
  const session: EmulatedCheckoutSession = {
    amount_subtotal: subtotal,
    amount_total: Math.max(0, subtotal - discount),
    client_secret: `${id}_secret_${crypto.randomUUID().replaceAll("-", "")}`,
    created: nowInSeconds(),
    currency: STRIPE_CURRENCY,
    customer: params.customer ?? null,
    customer_details: { email: customerEmail ?? null },
    customer_email: params.customer_email ?? null,
    id,
    livemode: false,
    metadata: params.metadata,
    mode: "payment",
    object: "checkout.session",
    payment_intent: null,
    payment_status: "unpaid",
    return_url: params.return_url,
    status: "open",
    ui_mode: "elements",
  }
  checkoutSessions.set(id, session)

  return Response.json(session)
}

const handleCheckoutSessions = ({ action, form, method, sessionId, url }: Readonly<CheckoutSessionRequest>): Response => {
  if (sessionId === undefined) {
    if (method === "POST") {
      return createCheckoutSession(form)
    }
    const paymentIntent = url.searchParams.get("payment_intent")

    return stripeList(
      url,
      [...checkoutSessions.values()].filter((session) => paymentIntent === null || session.payment_intent === paymentIntent),
    )
  }

  const session = checkoutSessions.get(sessionId)
  if (session === undefined) {
    return stripeError(`No such checkout.session: '${sessionId}'`, HTTP_STATUS.NOT_FOUND)
  }

  if (action === "expire") {
    const expired: EmulatedCheckoutSession = { ...session, status: "expired" }
    checkoutSessions.set(sessionId, expired)

    return Response.json(expired)
  }

  return Response.json(session)
}

const handleCoupons = (request: Request, form: StripeForm, couponId: string | undefined): Response => {
  if (couponId === undefined) {
    const params = stripeCouponParamsSchema.parse(form)
    const coupon: EmulatedCoupon = { ...params, duration: "once", id: stripeId("coupon"), object: "coupon", valid: true }
    coupons.set(coupon.id, coupon)

    return Response.json(coupon)
  }

  const coupon = coupons.get(couponId)
  if (coupon === undefined) {
    return stripeError(`No such coupon: '${couponId}'`, HTTP_STATUS.NOT_FOUND)
  }

  if (request.method === "DELETE") {
    coupons.delete(couponId)

    return Response.json({ deleted: true, id: couponId, object: "coupon" })
  }

  return Response.json(coupon)
}

const handleCustomers = (form: StripeForm): Response => {
  const params = stripeCustomerParamsSchema.parse(form)
  const customer: EmulatedCustomer = { ...params, id: stripeId("cus"), name: params.name ?? null, object: "customer" }
  customers.set(customer.id, customer)

  return Response.json(customer)
}

const handlePaymentIntents = (paymentIntentId: string | undefined): Response => {
  const paymentIntent = paymentIntentId === undefined ? undefined : paymentIntents.get(paymentIntentId)

  return paymentIntent === undefined ? stripeError(`No such payment_intent: '${String(paymentIntentId)}'`) : Response.json(paymentIntent)
}

const handleRefunds = (form: StripeForm): Response => {
  const params = stripeRefundParamsSchema.parse(form)

  return Response.json({
    amount: params.amount ?? paymentIntents.get(params.payment_intent)?.["amount"],
    currency: STRIPE_CURRENCY,
    id: stripeId("re"),
    object: "refund",
    payment_intent: params.payment_intent,
    status: "succeeded",
  })
}

const emulateStripe = async (request: Request, url: URL): Promise<Response> => {
  const form = request.method === "POST" ? parseStripeForm(await request.text()) : {}
  const [, resource, resourceId, ...rest] = url.pathname.split("/").filter(Boolean)

  switch (`${request.method} ${resource ?? ""}`) {
    case "DELETE coupons":
    case "GET coupons":
    case "POST coupons": {
      return handleCoupons(request, form, resourceId)
    }
    case "GET checkout":
    case "POST checkout": {
      const [sessionId, action] = rest

      return handleCheckoutSessions({ action, form, method: request.method, sessionId, url })
    }
    case "GET payment_intents": {
      return handlePaymentIntents(resourceId)
    }
    case "GET payment_methods": {
      return stripeList(url, [])
    }
    case "POST customers": {
      return handleCustomers(form)
    }
    case "POST refunds": {
      return handleRefunds(form)
    }
    default: {
      return stripeError(`The e2e Stripe emulator does not handle ${request.method} ${url.pathname}`)
    }
  }
}

export const completeCheckoutSession = (sessionId: string): string | undefined => {
  const session = checkoutSessions.get(sessionId)
  if (session === undefined) {
    return undefined
  }

  const paymentIntentId = stripeId("pi")
  paymentIntents.set(paymentIntentId, {
    amount: session.amount_total,
    currency: session.currency,
    id: paymentIntentId,
    object: "payment_intent",
    payment_method: { card: { brand: "visa", last4: "4242" }, id: stripeId("pm"), object: "payment_method", type: "card" },
    status: "succeeded",
  })
  const completed: EmulatedCheckoutSession = { ...session, payment_intent: paymentIntentId, payment_status: "paid", status: "complete" }
  checkoutSessions.set(sessionId, completed)

  return JSON.stringify({
    api_version: STRIPE_API_VERSION,
    created: nowInSeconds(),
    data: { object: completed },
    id: stripeId("evt"),
    livemode: false,
    object: "event",
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "checkout.session.completed",
  })
}

export const installProviderMocks = (): void => {
  globalThis.fetch = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    if (url.hostname === "api.resend.com") {
      return captureEmail(request)
    }

    if (url.hostname === "api.stripe.com") {
      return emulateStripe(request, url)
    }

    return nativeFetch(request)
  }
}

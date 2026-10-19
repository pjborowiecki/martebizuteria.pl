import { recordOrderEmailOutcome } from "~/src/modules/audit-log/audit-log.events.server"
import { ORDER_EMAIL_NOTICE_STATUS } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { sendIncidentAlert } from "~/src/lib/incident-alert.server"

export const ORDER_EMAIL_RETRIES = 2

export const ORDER_EMAIL_RETRY_DELAY_MS = 1000

export const ORDER_EMAIL_RETRY_BACKOFF = 4

const wait = async (milliseconds: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, milliseconds)
  await promise
}

const attemptOrderEmail = (
  send: OrderEmailSend,
  { idempotencyKey, label, orderId }: Readonly<OrderEmailDelivery>,
): Promise<OrderEmailOutcome> =>
  send(idempotencyKey).catch((error: unknown) => {
    console.error(`${label} for order ${orderId} could not be prepared:`, error)

    return { failure: error instanceof Error ? error.message : String(error), label }
  })

const recordOutcome = (
  { failure, label }: OrderEmailOutcome,
  { idempotencyKey, orderEmail, orderId }: Readonly<OrderEmailDelivery>,
  willRetry: boolean,
): void => {
  recordOrderEmailOutcome({ failure, label, metadata: { idempotencyKey, orderEmail }, orderId, willRetry })
}

const retryOrderEmail = async (
  send: OrderEmailSend,
  delivery: Readonly<OrderEmailDelivery>,
  { delayMs, retriesLeft }: Readonly<{ delayMs: number; retriesLeft: number }>,
): Promise<void> => {
  await wait(delayMs)
  const outcome = await attemptOrderEmail(send, delivery)
  if (outcome.failure !== undefined && retriesLeft > 1) {
    await retryOrderEmail(send, delivery, { delayMs: delayMs * ORDER_EMAIL_RETRY_BACKOFF, retriesLeft: retriesLeft - 1 })

    return
  }

  recordOutcome(outcome, delivery, false)
  if (outcome.failure !== undefined) {
    await sendIncidentAlert({
      detail: `${delivery.label} — ${outcome.failure}`,
      kind: "orderEmailFailed",
      reference: delivery.idempotencyKey,
    })
  }
}

export const deliverOrderEmail = async (send: OrderEmailSend, delivery: Readonly<OrderEmailDelivery>): Promise<boolean> => {
  const outcome = await attemptOrderEmail(send, delivery)
  const sent = outcome.failure === undefined
  recordOutcome(outcome, delivery, !sent)
  if (!sent) {
    scheduleBackgroundWork(retryOrderEmail(send, delivery, { delayMs: ORDER_EMAIL_RETRY_DELAY_MS, retriesLeft: ORDER_EMAIL_RETRIES }))
  }

  return sent
}

export const awaitOrderEmailNotice = async (
  kind: Order["emailNotice"]["kind"],
  delivery: Promise<boolean>,
): Promise<Order["emailNotice"]> => {
  scheduleBackgroundWork(delivery)

  return { kind, status: (await delivery) ? ORDER_EMAIL_NOTICE_STATUS.SENT : ORDER_EMAIL_NOTICE_STATUS.FAILED }
}

export const announceClaimedOrderEmail = (
  kind: Order["emailNotice"]["kind"],
  claimed: boolean,
  send: () => Promise<boolean>,
): Promise<Order["emailNotice"]> =>
  claimed ? awaitOrderEmailNotice(kind, send()) : Promise.resolve({ kind, status: ORDER_EMAIL_NOTICE_STATUS.ALREADY_SENT })

export interface OrderEmailOutcome {
  readonly failure: string | undefined
  readonly label: string
}

type OrderEmailSend = (idempotencyKey: string) => Promise<OrderEmailOutcome>

interface OrderEmailDelivery {
  readonly idempotencyKey: string
  readonly label: string
  readonly orderEmail?: Order["email"]
  readonly orderId: string
}

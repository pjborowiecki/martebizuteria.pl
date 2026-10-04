import { recordOrderEmailOutcome } from "~/src/modules/audit-log/audit-log.events.server"

export const recordOrderEmailAttempt = async (
  attempt: Promise<OrderEmailOutcome>,
  { label, orderId }: Readonly<{ label: string; orderId: string }>,
): Promise<boolean> => {
  const outcome = await attempt.catch((error: unknown) => {
    console.error(`${label} for order ${orderId} could not be prepared:`, error)

    return { failure: error instanceof Error ? error.message : String(error), label }
  })
  recordOrderEmailOutcome({ failure: outcome.failure, label: outcome.label, orderId })

  return outcome.failure === undefined
}

export interface OrderEmailOutcome {
  readonly failure: string | undefined
  readonly label: string
}

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

// Checkout drafts live in sessionStorage, not localStorage: they survive reloads and restored tabs but are cleared when the tab closes.
// That keeps the shopper's progress on refresh — matching big-store checkout UX — without leaving PII lingering on a shared machine.
const STORAGE_KEY = "marte-checkout-draft"
// Bump when the persisted shape changes so stale drafts are ignored, not crash.
const SCHEMA_VERSION = 1

interface CheckoutDraftEnvelope {
  readonly v: number
  readonly values: Partial<CheckoutFormSchema>
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const isDraftEnvelope = (value: unknown): value is CheckoutDraftEnvelope =>
  isRecord(value) && value["v"] === SCHEMA_VERSION && isRecord(value["values"])

const getStore = (): Storage | undefined => {
  if (typeof sessionStorage === "undefined") {
    return undefined
  }
  try {
    return globalThis.sessionStorage
  } catch {
    // Storage can throw in privacy modes / sandboxed iframes.
    return undefined
  }
}

export const loadCheckoutDraft = (): Partial<CheckoutFormSchema> | undefined => {
  const store = getStore()
  if (store === undefined) {
    return undefined
  }
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (raw === null) {
      return undefined
    }
    const parsed: unknown = JSON.parse(raw)
    return isDraftEnvelope(parsed) ? parsed.values : undefined
  } catch {
    return undefined
  }
}

export const saveCheckoutDraft = (values: Partial<CheckoutFormSchema>): void => {
  const store = getStore()
  if (store === undefined) {
    return
  }
  try {
    const envelope: CheckoutDraftEnvelope = { v: SCHEMA_VERSION, values }
    store.setItem(STORAGE_KEY, JSON.stringify(envelope))
  } catch {
    // Quota or serialization failure: persistence is best-effort, never fatal.
  }
}

export const clearCheckoutDraft = (): void => {
  const store = getStore()
  if (store === undefined) {
    return
  }
  try {
    store.removeItem(STORAGE_KEY)
  } catch {
    // No-op: clearing is best-effort.
  }
}

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

const STORAGE_KEY = "marte-checkout-draft"

const SESSION_ID_STORAGE_KEY = "marte-checkout-session"

const SESSION_ID_CHANGE_EVENT = "checkout-session-change"

const SCHEMA_VERSION = 1

interface CheckoutDraftEnvelope {
  readonly v: number
  readonly values: Partial<CheckoutFormSchema>
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const isDraftEnvelope = (value: unknown): value is CheckoutDraftEnvelope =>
  isRecord(value) && value["v"] === SCHEMA_VERSION && isRecord(value["values"])

const getStore = (readStorage: () => Storage | undefined): Storage | undefined => {
  try {
    return readStorage()
  } catch {
    return undefined
  }
}

const getDraftStore = (): Storage | undefined => getStore(() => globalThis.sessionStorage)

const getSessionIdStore = (): Storage | undefined => getStore(() => globalThis.localStorage)

export const loadCheckoutDraft = (): Partial<CheckoutFormSchema> | undefined => {
  const store = getDraftStore()
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
  const store = getDraftStore()
  if (store === undefined) {
    return
  }

  try {
    const envelope: CheckoutDraftEnvelope = { v: SCHEMA_VERSION, values }
    store.setItem(STORAGE_KEY, JSON.stringify(envelope))
  } catch {}
}

export const loadCheckoutSessionId = (): string | undefined => {
  const store = getSessionIdStore()
  if (store === undefined) {
    return undefined
  }

  try {
    return store.getItem(SESSION_ID_STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

const announceCheckoutSessionIdChange = (): void => {
  globalThis.dispatchEvent(new Event(SESSION_ID_CHANGE_EVENT))
}

export const saveCheckoutSessionId = (sessionId: string): void => {
  const store = getSessionIdStore()
  if (store === undefined) {
    return
  }

  try {
    store.setItem(SESSION_ID_STORAGE_KEY, sessionId)
  } catch {}
  announceCheckoutSessionIdChange()
}

export const subscribeToCheckoutSessionId = (onChange: () => void): (() => void) => {
  globalThis.addEventListener(SESSION_ID_CHANGE_EVENT, onChange)
  globalThis.addEventListener("storage", onChange)

  return () => {
    globalThis.removeEventListener(SESSION_ID_CHANGE_EVENT, onChange)
    globalThis.removeEventListener("storage", onChange)
  }
}

const forget = (store: Storage | undefined, key: string): void => {
  try {
    store?.removeItem(key)
  } catch {}
}

export const clearCheckoutDraft = (): void => {
  forget(getDraftStore(), STORAGE_KEY)
  forget(getSessionIdStore(), SESSION_ID_STORAGE_KEY)
  announceCheckoutSessionIdChange()
}

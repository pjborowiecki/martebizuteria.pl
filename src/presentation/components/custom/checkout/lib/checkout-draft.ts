import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

const STORAGE_KEY = "marte-checkout-draft"

const SESSION_ID_STORAGE_KEY = "marte-checkout-session"

const SESSION_ID_CHANGE_EVENT = "checkout-session-change"

const SCHEMA_VERSION = 1

interface CheckoutDraftEnvelope {
  readonly v: number
  readonly values: Partial<CheckoutFormSchema>
}

interface CheckoutCartLine {
  readonly qty: number
  readonly variantId: string
}

interface HeldCheckoutSession {
  readonly cart: string
  readonly sessionId: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const isDraftEnvelope = (value: unknown): value is CheckoutDraftEnvelope =>
  isRecord(value) && value["v"] === SCHEMA_VERSION && isRecord(value["values"])

const isHeldCheckoutSession = (value: unknown): value is HeldCheckoutSession =>
  isRecord(value) && typeof value["cart"] === "string" && typeof value["sessionId"] === "string"

const fingerprintCart = (lines: readonly CheckoutCartLine[]): string =>
  lines
    .map((line) => `${line.variantId}:${line.qty}`)
    .toSorted((left, right) => left.localeCompare(right))
    .join("|")

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

const loadHeldCheckoutSession = (): HeldCheckoutSession | undefined => {
  const store = getSessionIdStore()
  if (store === undefined) {
    return undefined
  }

  try {
    const raw = store.getItem(SESSION_ID_STORAGE_KEY)
    if (raw === null) {
      return undefined
    }

    const parsed: unknown = JSON.parse(raw)

    return isHeldCheckoutSession(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export const loadCheckoutSessionId = (): string | undefined => loadHeldCheckoutSession()?.sessionId

export const loadCheckoutSessionIdOnServer = (): string | undefined => undefined

export const wasCheckoutSessionOpenedForAnotherCart = (sessionId: string, cart: readonly CheckoutCartLine[]): boolean => {
  const held = loadHeldCheckoutSession()

  return held?.sessionId === sessionId && held.cart !== fingerprintCart(cart)
}

export const isCheckoutSessionHeldForCart = (sessionId: string, cart: readonly CheckoutCartLine[]): boolean => {
  const held = loadHeldCheckoutSession()

  return held?.sessionId === sessionId && held.cart === fingerprintCart(cart)
}

const announceCheckoutSessionIdChange = (): void => {
  globalThis.dispatchEvent(new Event(SESSION_ID_CHANGE_EVENT))
}

export const saveCheckoutSession = ({ lines, sessionId }: Readonly<{ lines: readonly CheckoutCartLine[]; sessionId: string }>): void => {
  const store = getSessionIdStore()
  if (store === undefined) {
    return
  }

  try {
    const held: HeldCheckoutSession = { cart: fingerprintCart(lines), sessionId }
    store.setItem(SESSION_ID_STORAGE_KEY, JSON.stringify(held))
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

const forgetHeldCheckoutSession = (): void => {
  forget(getSessionIdStore(), SESSION_ID_STORAGE_KEY)
  announceCheckoutSessionIdChange()
}

export const forgetCheckoutSessionId = (sessionId: string): void => {
  if (loadCheckoutSessionId() === sessionId) {
    forgetHeldCheckoutSession()
  }
}

export const clearCheckoutDraft = (): void => {
  forget(getDraftStore(), STORAGE_KEY)
  forgetHeldCheckoutSession()
}

import type { CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod";

// Checkout drafts live in sessionStorage (not localStorage): they survive page
// reloads and restored tabs, but are cleared when the tab closes. This keeps
// the shopper's progress on refresh — matching big-store checkout UX — without
// leaving PII (email/phone/address) lingering on a shared machine indefinitely.
const STORAGE_KEY = "marte-checkout-draft";
// Bump when the persisted shape changes so stale drafts are ignored, not crash.
const SCHEMA_VERSION = 1;

interface CheckoutDraftEnvelope {
  readonly v: number;
  readonly values: Partial<CheckoutFormSchema>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDraftEnvelope(value: unknown): value is CheckoutDraftEnvelope {
  return isRecord(value) && value.v === SCHEMA_VERSION && isRecord(value.values);
}

function getStore(): Storage | undefined {
  if (globalThis.sessionStorage === undefined) {
    return undefined;
  }
  try {
    return globalThis.sessionStorage;
  } catch {
    // Storage can throw in privacy modes / sandboxed iframes.
    return undefined;
  }
}

export function loadCheckoutDraft(): Partial<CheckoutFormSchema> | undefined {
  const store = getStore();
  if (store === undefined) {
    return undefined;
  }
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (raw === null) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(raw);
    return isDraftEnvelope(parsed) ? parsed.values : undefined;
  } catch {
    return undefined;
  }
}

export function saveCheckoutDraft(values: Partial<CheckoutFormSchema>): void {
  const store = getStore();
  if (store === undefined) {
    return;
  }
  try {
    const envelope: CheckoutDraftEnvelope = { v: SCHEMA_VERSION, values };
    store.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota or serialization failure: persistence is best-effort, never fatal.
  }
}

export function clearCheckoutDraft(): void {
  const store = getStore();
  if (store === undefined) {
    return;
  }
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // No-op: clearing is best-effort.
  }
}

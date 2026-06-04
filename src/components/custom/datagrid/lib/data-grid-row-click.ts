/* Module-scoped guard for portaled menu/dialog click-through (not test setup). */
/* eslint-disable vitest/require-hook -- intentional process-wide one-shot flag */
let suppressRowClickUntil = 0;
/* eslint-enable vitest/require-hook */

/** Default suppression after menu actions (covers same-tick dismiss). */
const DEFAULT_ROW_CLICK_SUPPRESS_MS = 300;

/** Longer suppression after alert-dialog dismiss (click-through can land on the next macrotask). */
export const DIALOG_DISMISS_ROW_CLICK_SUPPRESS_MS = 500;

/** Ignore row `onClick` until `durationMs` from now (extends an active window). */
export function suppressNextDataGridRowClick(durationMs = DEFAULT_ROW_CLICK_SUPPRESS_MS): void {
  suppressRowClickUntil = Math.max(suppressRowClickUntil, Date.now() + durationMs);
}

export function suppressDataGridRowClickAfterDialogDismiss(): void {
  suppressNextDataGridRowClick(DIALOG_DISMISS_ROW_CLICK_SUPPRESS_MS);
}

export function consumeDataGridRowClickSuppression(): boolean {
  return Date.now() < suppressRowClickUntil;
}

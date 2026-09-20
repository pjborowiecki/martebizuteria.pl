/* Module-scoped guard for portaled menu/dialog click-through. */
let suppressRowClickUntil = 0

/** Default suppression after menu actions (covers same-tick dismiss). */
const DEFAULT_ROW_CLICK_SUPPRESS_MS = 300

/** Longer suppression after alert-dialog dismiss (click-through can land on the next macrotask). */
export const DIALOG_DISMISS_ROW_CLICK_SUPPRESS_MS = 500

/** Ignore row `onClick` until `durationMs` from now (extends an active window). */
export const suppressNextDataGridRowClick = (durationMs = DEFAULT_ROW_CLICK_SUPPRESS_MS): void => {
  suppressRowClickUntil = Math.max(suppressRowClickUntil, Date.now() + durationMs)
}

export const suppressDataGridRowClickAfterDialogDismiss = (): void => {
  suppressNextDataGridRowClick(DIALOG_DISMISS_ROW_CLICK_SUPPRESS_MS)
}

export const consumeDataGridRowClickSuppression = (): boolean => Date.now() < suppressRowClickUntil

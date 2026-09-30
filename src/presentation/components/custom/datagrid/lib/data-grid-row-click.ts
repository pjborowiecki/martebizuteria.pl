let suppressRowClickUntil = 0

const DEFAULT_ROW_CLICK_SUPPRESS_MS = 300

const DIALOG_DISMISS_ROW_CLICK_SUPPRESS_MS = 500

export const suppressNextDataGridRowClick = (durationMs = DEFAULT_ROW_CLICK_SUPPRESS_MS): void => {
  suppressRowClickUntil = Math.max(suppressRowClickUntil, Date.now() + durationMs)
}

export const suppressDataGridRowClickAfterDialogDismiss = (): void => {
  suppressNextDataGridRowClick(DIALOG_DISMISS_ROW_CLICK_SUPPRESS_MS)
}

export const consumeDataGridRowClickSuppression = (): boolean => Date.now() < suppressRowClickUntil

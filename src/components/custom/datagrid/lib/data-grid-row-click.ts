/* Module-scoped guard for portaled menu click-through (not test setup). */
/* eslint-disable vitest/require-hook -- intentional process-wide one-shot flag */
let suppressNextRowClick = false;
/* eslint-enable vitest/require-hook */

/** Call before a portaled menu action closes so the row `onClick` does not fire underneath. */
export function suppressNextDataGridRowClick(): void {
  suppressNextRowClick = true;
  queueMicrotask(() => {
    suppressNextRowClick = false;
  });
}

export function consumeDataGridRowClickSuppression(): boolean {
  if (!suppressNextRowClick) {
    return false;
  }

  suppressNextRowClick = false;
  return true;
}

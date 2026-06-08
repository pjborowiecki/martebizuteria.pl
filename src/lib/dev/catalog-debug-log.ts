export function catalogDebugLog(label: string, data?: unknown): void {
  if (!import.meta.env.DEV) {
    return;
  }

  if (data === undefined) {
    console.info(`[catalog] ${label}`);
    return;
  }

  console.info(`[catalog] ${label}`, data);
}

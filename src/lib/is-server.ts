/** True during SSR (no `document` yet). */
export function isServer(): boolean {
  return typeof document === "undefined";
}

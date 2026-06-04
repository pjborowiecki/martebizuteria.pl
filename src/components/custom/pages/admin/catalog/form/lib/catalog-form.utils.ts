export function catalogFieldStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Base UI Select treats `undefined` as uncontrolled — keep an empty string for no selection. */
export function catalogSelectControlValue(value: string): string {
  return value;
}

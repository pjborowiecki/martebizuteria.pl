const hasLabel = <TValue extends string>(value: unknown, labelKeys: Readonly<Record<TValue, string>>): value is TValue =>
  typeof value === "string" && Object.hasOwn(labelKeys, value)

export const catalogFilterLabelKey = <TValue extends string>(
  value: unknown,
  labelKeys: Readonly<Record<TValue, string>>,
): string | undefined => (hasLabel(value, labelKeys) ? labelKeys[value] : undefined)

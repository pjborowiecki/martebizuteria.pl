/** Appends the shared required-field suffix when `required` is true. */
export function buildCatalogFormFieldHint(
  hint: string | undefined,
  required: boolean | undefined,
  requiredSuffix: string
): string | undefined {
  if (hint === undefined) {
    return undefined;
  }

  if (required !== true) {
    return hint;
  }

  const suffix = requiredSuffix.trim();
  if (suffix === "" || hint.includes(suffix)) {
    return hint;
  }

  return `${hint} ${requiredSuffix}`;
}

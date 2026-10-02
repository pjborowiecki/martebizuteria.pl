export const resolveStripeObjectId = (reference: string | { readonly id: string } | null): string | undefined =>
  typeof reference === "string" ? reference : reference?.id

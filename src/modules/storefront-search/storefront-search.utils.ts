const TOKEN_SEPARATOR = /[^\p{L}\p{N}]+/u

export const foldStorefrontSearchText = (text: string): string => text.replaceAll("ł", "l").replaceAll("Ł", "L")

export const buildStorefrontSearchExpression = (term: string): string | undefined => {
  const tokens = foldStorefrontSearchText(term)
    .split(TOKEN_SEPARATOR)
    .filter((token) => token !== "")
  if (tokens.length === 0) {
    return undefined
  }

  return tokens.map((token) => `"${token}"*`).join(" ")
}

const NIP_CHECK_WEIGHTS = Array.from("657234567", Number)

const REGON_CHECK_WEIGHTS: ReadonlyMap<number, readonly number[]> = new Map(
  ["89234567", "2485097361248"].map((weights) => [weights.length + 1, Array.from(weights, Number)]),
)

const CHECK_MODULUS = 11

const REGON_CHECK_DIGIT_MODULUS = 10

const NO_WEIGHTED_SUM = 0

const DIGITS_ONLY = /^\d+$/u

const ID_SEPARATORS = /[\s-]/gu

const NIP_COUNTRY_PREFIX = /^PL/iu

const checksumOf = (digits: string, weights: readonly number[]): number =>
  weights.reduce((sum, weight, index) => sum + weight * Number(digits.charAt(index)), NO_WEIGHTED_SUM) % CHECK_MODULUS

const isDigitsOfLength = (value: string, length: number): boolean => value.length === length && DIGITS_ONLY.test(value)

export const normalizeNip = (value: string): string => value.replaceAll(ID_SEPARATORS, "").replace(NIP_COUNTRY_PREFIX, "")

export const isValidNip = (nip: string): boolean =>
  isDigitsOfLength(nip, NIP_CHECK_WEIGHTS.length + 1) && checksumOf(nip, NIP_CHECK_WEIGHTS) === Number(nip.charAt(NIP_CHECK_WEIGHTS.length))

export const normalizeRegon = (value: string): string => value.replaceAll(ID_SEPARATORS, "")

export const isValidRegon = (regon: string): boolean => {
  const weights = REGON_CHECK_WEIGHTS.get(regon.length)

  return (
    weights !== undefined &&
    isDigitsOfLength(regon, weights.length + 1) &&
    checksumOf(regon, weights) % REGON_CHECK_DIGIT_MODULUS === Number(regon.charAt(weights.length))
  )
}

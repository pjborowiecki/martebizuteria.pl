import {
  STORE_CURRENCY_CODE,
  STRIPE_MIN_MAJOR_UNITS,
  type SupportedCurrencyCode,
  getCurrencyExponent,
  isSupportedCurrencyCode,
} from "~/src/modules/_core/constants/currency"

export const normalizeCurrencyCode = (code: string): SupportedCurrencyCode | undefined => {
  const normalized = code.trim().toUpperCase()

  return isSupportedCurrencyCode(normalized) ? normalized : undefined
}

export const resolveCurrencyCode = (code?: string): SupportedCurrencyCode => {
  if (code === undefined) {
    return STORE_CURRENCY_CODE
  }

  const normalized = normalizeCurrencyCode(code)
  if (normalized === undefined) {
    throw new Error(`Unsupported currency code: ${code}`)
  }

  return normalized
}

export const getCurrencyDefinition = (code: string): CurrencyDefinition => {
  const resolved = resolveCurrencyCode(code)

  return {
    code: resolved,
    minorUnitExponent: getCurrencyExponent(resolved),
    stripeMinMajorUnits: STRIPE_MIN_MAJOR_UNITS[resolved],
  }
}

export const minorUnitsPerMajor = (currencyCode: string): number => {
  const { minorUnitExponent } = getCurrencyDefinition(currencyCode)

  return MINOR_UNITS_BASE ** minorUnitExponent
}

export const getMinPriceMinorUnits = (currencyCode?: string): number => {
  const definition = getCurrencyDefinition(resolveCurrencyCode(currencyCode))

  return Math.round(definition.stripeMinMajorUnits * minorUnitsPerMajor(definition.code))
}

export const getMoneyInputStep = (currencyCode?: string): string => {
  const { minorUnitExponent } = getCurrencyDefinition(resolveCurrencyCode(currencyCode))
  if (minorUnitExponent === 0) {
    return INTEGER_STEP
  }

  return `0.${FRACTIONAL_STEP_SUFFIX.padStart(minorUnitExponent, "0")}`
}

export const getExampleMajorAmount = (currencyCode?: string): number => {
  const definition = getCurrencyDefinition(resolveCurrencyCode(currencyCode))

  return definition.stripeMinMajorUnits >= STRIPE_MIN_MAJOR_UNITS_FOR_EXAMPLE
    ? MONEY_INPUT_EXAMPLE_MAJOR_AMOUNT
    : Math.max(definition.stripeMinMajorUnits, STRIPE_MIN_MAJOR_UNITS_FOR_EXAMPLE)
}

const compactMoneyInput = (input: string): string => input.trim().replaceAll(/\s/gu, "")

const escapeRegExp = (value: string): string => value.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)

export const getLocaleDecimalSeparator = (locale: string): string => {
  const parts = new Intl.NumberFormat(locale).formatToParts(MONEY_INPUT_EXAMPLE_MAJOR_AMOUNT + LOCALE_DECIMAL_PROBE_FRACTION)

  return parts.find((part) => part.type === "decimal")?.value ?? DEFAULT_DECIMAL_SEPARATOR
}

const buildPartialMoneyPattern = (exponent: number, decimalSeparator = DEFAULT_DECIMAL_SEPARATOR): RegExp => {
  if (exponent === 0) {
    return /^\d*$/u
  }

  const escapedSeparator = escapeRegExp(decimalSeparator)

  return new RegExp(`^\\d*(?:${escapedSeparator}\\d{0,${exponent}})?$`, "u")
}

const buildCompleteMoneyPattern = (exponent: number, decimalSeparator = DEFAULT_DECIMAL_SEPARATOR): RegExp => {
  if (exponent === 0) {
    return /^\d+$/u
  }

  const escapedSeparator = escapeRegExp(decimalSeparator)

  return new RegExp(`^\\d+(?:${escapedSeparator}\\d{1,${exponent}})?$`, "u")
}

const normalizeMoneyDecimalSeparator = (input: string, locale?: string): string | undefined => {
  const compact = compactMoneyInput(input)
  const primarySeparator = locale === undefined ? DEFAULT_DECIMAL_SEPARATOR : getLocaleDecimalSeparator(locale)
  const alternateSeparator = primarySeparator === "," ? "." : ","
  const hasPrimary = compact.includes(primarySeparator)
  const hasAlternate = compact.includes(alternateSeparator)
  if (hasPrimary && hasAlternate) {
    return undefined
  }

  if (hasPrimary) {
    return compact.replaceAll(primarySeparator, DEFAULT_DECIMAL_SEPARATOR)
  }

  if (hasAlternate) {
    return compact.replaceAll(alternateSeparator, DEFAULT_DECIMAL_SEPARATOR)
  }

  return compact
}

export const isPartialMoneyInput = (input: string, currencyCode: string, locale?: string): boolean => {
  const { minorUnitExponent } = getCurrencyDefinition(currencyCode)
  const normalized = normalizeMoneyDecimalSeparator(input, locale)
  if (normalized === undefined) {
    return false
  }

  return buildPartialMoneyPattern(minorUnitExponent, DEFAULT_DECIMAL_SEPARATOR).test(normalized)
}

export const isCompleteMoneyInput = (input: string, currencyCode: string, locale?: string): boolean => {
  const { minorUnitExponent } = getCurrencyDefinition(currencyCode)
  const compact = compactMoneyInput(input)
  const primarySeparator = locale === undefined ? DEFAULT_DECIMAL_SEPARATOR : getLocaleDecimalSeparator(locale)
  const alternateSeparator = primarySeparator === "," ? "." : ","
  const normalized = normalizeMoneyDecimalSeparator(input, locale)
  if (normalized === undefined || normalized === EMPTY_INPUT) {
    return false
  }

  if (minorUnitExponent > 0 && (compact.endsWith(primarySeparator) || compact.endsWith(alternateSeparator))) {
    return false
  }

  return buildCompleteMoneyPattern(minorUnitExponent, DEFAULT_DECIMAL_SEPARATOR).test(normalized)
}

const parseCompactMoneyToMinor = (compact: string, minorUnitExponent: number): number => {
  const minorPerMajor = MINOR_UNITS_BASE ** minorUnitExponent
  if (minorUnitExponent === 0) {
    return Number.parseInt(compact, DECIMAL_RADIX) * minorPerMajor
  }

  const [integerPart = "", fractionPart = ""] = compact.split(".")
  const majorUnits = Number.parseInt(integerPart, DECIMAL_RADIX)
  const minorUnits =
    fractionPart === "" ? 0 : Number.parseInt(fractionPart.padEnd(minorUnitExponent, "0").slice(0, minorUnitExponent), DECIMAL_RADIX)
  return majorUnits * minorPerMajor + minorUnits
}

export const parseMoneyInputToMinorUnits = (input: string, currencyCode: string, locale?: string): number | undefined => {
  const trimmed = input.trim()
  if (trimmed === EMPTY_INPUT) {
    return 0
  }

  const normalized = normalizeMoneyDecimalSeparator(trimmed, locale)
  if (normalized === undefined || !isCompleteMoneyInput(trimmed, currencyCode, locale)) {
    return undefined
  }

  const { minorUnitExponent } = getCurrencyDefinition(currencyCode)

  return parseCompactMoneyToMinor(normalized, minorUnitExponent)
}

export const formatMinorUnitsToNumberInput = (minorUnits: number, currencyCode: string): string => {
  const { minorUnitExponent } = getCurrencyDefinition(currencyCode)
  const major = minorUnits / minorUnitsPerMajor(currencyCode)

  return major.toFixed(minorUnitExponent)
}

export const formatMinorUnitsToMoneyInput = (minorUnits: number, currencyCode: string, locale: string): string =>
  formatMinorUnitsAsDecimal(minorUnits, {
    currencyCode,
    locale,
    useGrouping: false,
  })

const coercePartialMoneyInput = (input: string, currencyCode: string, locale?: string): string => {
  const compact = compactMoneyInput(input)
  let built = EMPTY_INPUT
  for (const char of compact) {
    const next = built + char
    if (isPartialMoneyInput(next, currencyCode, locale)) {
      built = next
    }
  }

  return built
}

export const toNumberMoneyInputValue = (value: string, currencyCode: string, locale?: string): string => {
  if (value === EMPTY_INPUT) {
    return EMPTY_INPUT
  }

  const coerced = coercePartialMoneyInput(value, currencyCode, locale)
  if (coerced === EMPTY_INPUT) {
    return EMPTY_INPUT
  }

  const minor = parseMoneyInputToMinorUnits(coerced, currencyCode, locale)
  if (minor === undefined) {
    return coerced
  }

  if (locale === undefined) {
    return formatMinorUnitsToNumberInput(minor, currencyCode)
  }

  return formatMinorUnitsToMoneyInput(minor, currencyCode, locale)
}

export const formatMinorUnits = (amountInMinorUnits: number, currencyCode: string, locale: string): string => {
  const definition = getCurrencyDefinition(currencyCode)
  const major = amountInMinorUnits / minorUnitsPerMajor(definition.code)

  return new Intl.NumberFormat(locale, {
    currency: definition.code,
    style: "currency",
  }).format(major)
}

export const formatMinorUnitsAsDecimal = (
  amountInMinorUnits: number,
  { currencyCode, locale, useGrouping = false }: FormatMinorUnitsAsDecimalOptions,
): string => {
  const definition = getCurrencyDefinition(currencyCode)
  const major = amountInMinorUnits / minorUnitsPerMajor(definition.code)

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: definition.minorUnitExponent,
    minimumFractionDigits: definition.minorUnitExponent,
    useGrouping,
  }).format(major)
}

export const formatPrice = (amountInMinorUnits: number, currency: string, locale: string): string => {
  const normalized = currency.toUpperCase()
  if (normalized === STORE_CURRENCY_CODE) {
    return formatMinorUnits(amountInMinorUnits, normalized, locale)
  }

  return new Intl.NumberFormat(locale, {
    currency: normalized,
    style: "currency",
  }).format(amountInMinorUnits / minorUnitsPerMajor(normalized))
}

export const parseMoneyInputToCents = (input: string): number => parseMoneyInputToMinorUnits(input, STORE_CURRENCY_CODE) ?? 0

export const formatCentsToMoneyInput = (cents: number, locale?: string): string => {
  if (locale === undefined) {
    return formatMinorUnitsToNumberInput(cents, STORE_CURRENCY_CODE)
  }

  return formatMinorUnitsToMoneyInput(cents, STORE_CURRENCY_CODE, locale)
}

export const isSellPriceCentsValid = (cents: number): boolean => cents >= MIN_PRICE_CENTS

export const isCompareAtValid = (priceMinor: number, compareAtInput: string, currencyCode = STORE_CURRENCY_CODE): boolean => {
  if (compareAtInput.trim() === EMPTY_INPUT) {
    return true
  }

  const compareAtMinor = parseMoneyInputToMinorUnits(compareAtInput, currencyCode)
  if (compareAtMinor === undefined) {
    return false
  }

  return compareAtMinor >= priceMinor
}

export const centsToDisplayAmount = (cents: number, currencyCode = STORE_CURRENCY_CODE): number => cents / minorUnitsPerMajor(currencyCode)

const MINOR_UNITS_BASE = 10

const MONEY_INPUT_EXAMPLE_MAJOR_AMOUNT = 199

const LOCALE_DECIMAL_PROBE_FRACTION = 0.1

const STRIPE_MIN_MAJOR_UNITS_FOR_EXAMPLE = 1

const EMPTY_INPUT = ""

const DECIMAL_RADIX = 10

const INTEGER_STEP = "1"

const FRACTIONAL_STEP_SUFFIX = "1"

export interface CurrencyDefinition {
  readonly code: SupportedCurrencyCode
  readonly minorUnitExponent: number
  readonly stripeMinMajorUnits: number
}

export interface FormatMinorUnitsAsDecimalOptions {
  readonly currencyCode: string
  readonly locale: string
  readonly useGrouping?: boolean
}

const DEFAULT_DECIMAL_SEPARATOR = "."

export const MIN_PRICE_CENTS = getMinPriceMinorUnits(STORE_CURRENCY_CODE)

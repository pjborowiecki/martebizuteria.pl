import { SUPPORTED_CURRENCY_CODES, STORE_CURRENCY_CODE, type SupportedCurrencyCode } from "~/src/constants/_constants/currency";

/** Base for minor-units-per-major (10^exponent). */
const MINOR_UNITS_BASE = 10;

/** ISO currencies with no fractional minor units (e.g. JPY). */
const ZERO_MINOR_UNIT_EXPONENT = 0;

/** Offset when building fractional `step` strings (`exponent - 1`). */
const FRACTIONAL_STEP_ZERO_PAD_COUNT = 1;

/** Default major-unit amount shown in money input placeholders. */
const MONEY_INPUT_EXAMPLE_MAJOR_AMOUNT = 199;

/** Fraction added to {@link MONEY_INPUT_EXAMPLE_MAJOR_AMOUNT} when probing locale decimal separators. */
const LOCALE_DECIMAL_PROBE_FRACTION = 0.1;

/** Threshold: Stripe minimum ≥ this major unit uses {@link MONEY_INPUT_EXAMPLE_MAJOR_AMOUNT}. */
const STRIPE_MIN_MAJOR_UNITS_FOR_EXAMPLE = 1;

const EMPTY_INPUT = "";
const ZERO_MINOR = 0;
const NO_DECIMAL_INDEX = -1;
const DECIMAL_OFFSET = 1;
const SINGLE_FRACTION_DIGIT = 1;
const ZERO_FRACTION_MINOR = 0;
const SLICE_START = 0;
const DECIMAL_RADIX = 10;
const FRACTION_PAD_OFFSET = 1;

const INTEGER_STEP = "1";
const FRACTIONAL_STEP_SUFFIX = "1";

/** ISO 4217 metadata used for money input, validation, and display. */
export interface CurrencyDefinition {
  /** Uppercase ISO 4217 code (e.g. `PLN`, `USD`). */
  readonly code: SupportedCurrencyCode;
  /**
   * Number of decimal places in the minor unit (ISO 4217).
   * @example 2 for PLN/USD/EUR (grosze/cents), 0 for JPY.
   */
  readonly minorUnitExponent: number;
  /** Stripe minimum charge in major units — https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts */
  readonly stripeMinMajorUnits: number;
}

export interface FormatMinorUnitsAsDecimalOptions {
  readonly currencyCode: string;
  readonly locale: string;
  readonly useGrouping?: boolean;
}

/**
 * Registry keyed by ISO 4217 code. Only {@link SUPPORTED_CURRENCY_CODES} are enabled
 * in the app today; add rows when enabling additional Stripe regions.
 */
const CURRENCY_REGISTRY = {
  PLN: { minorUnitExponent: 2, stripeMinMajorUnits: 2 }
} as const satisfies Record<SupportedCurrencyCode, Omit<CurrencyDefinition, "code">>;

const SUPPORTED_CURRENCY_SET = new Set<string>(SUPPORTED_CURRENCY_CODES);

export function isSupportedCurrencyCode(code: string): code is SupportedCurrencyCode {
  const normalized = code.trim().toUpperCase();
  return SUPPORTED_CURRENCY_SET.has(normalized);
}

export function normalizeCurrencyCode(code: string): SupportedCurrencyCode | undefined {
  const normalized = code.trim().toUpperCase();
  return isSupportedCurrencyCode(normalized) ? normalized : undefined;
}

/** Resolves a currency code, defaulting to {@link STORE_CURRENCY_CODE}. */
export function resolveCurrencyCode(code?: string): SupportedCurrencyCode {
  if (code === undefined) {
    return STORE_CURRENCY_CODE;
  }

  const normalized = normalizeCurrencyCode(code);
  if (normalized === undefined) {
    throw new Error(`Unsupported currency code: ${code}`);
  }

  return normalized;
}

export function getCurrencyDefinition(code: string): CurrencyDefinition {
  const resolved = resolveCurrencyCode(code);
  const entry = CURRENCY_REGISTRY[resolved];

  return {
    code: resolved,
    minorUnitExponent: entry.minorUnitExponent,
    stripeMinMajorUnits: entry.stripeMinMajorUnits
  };
}

export function minorUnitsPerMajor(currencyCode: string): number {
  const { minorUnitExponent } = getCurrencyDefinition(currencyCode);
  return MINOR_UNITS_BASE ** minorUnitExponent;
}

export function getMinPriceMinorUnits(currencyCode?: string): number {
  const definition = getCurrencyDefinition(resolveCurrencyCode(currencyCode));
  return Math.round(definition.stripeMinMajorUnits * minorUnitsPerMajor(definition.code));
}

/** `step` attribute for `<input type="number" />` in major units. */
export function getMoneyInputStep(currencyCode?: string): string {
  const { minorUnitExponent } = getCurrencyDefinition(resolveCurrencyCode(currencyCode));
  if (minorUnitExponent === ZERO_MINOR_UNIT_EXPONENT) {
    return INTEGER_STEP;
  }

  return `0.${"0".repeat(minorUnitExponent - FRACTIONAL_STEP_ZERO_PAD_COUNT)}${FRACTIONAL_STEP_SUFFIX}`;
}

export function getExampleMajorAmount(currencyCode?: string): number {
  const definition = getCurrencyDefinition(resolveCurrencyCode(currencyCode));
  return definition.stripeMinMajorUnits >= STRIPE_MIN_MAJOR_UNITS_FOR_EXAMPLE
    ? MONEY_INPUT_EXAMPLE_MAJOR_AMOUNT
    : Math.max(definition.stripeMinMajorUnits, STRIPE_MIN_MAJOR_UNITS_FOR_EXAMPLE);
}

function compactMoneyInput(input: string): string {
  return input.trim().replaceAll(/\s/gu, "");
}

const DEFAULT_DECIMAL_SEPARATOR = ".";

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

/** Locale decimal separator from {@link Intl.NumberFormat} (e.g. `,` for `pl`, `.` for `en-US`). */
export function getLocaleDecimalSeparator(locale: string): string {
  const parts = new Intl.NumberFormat(locale).formatToParts(MONEY_INPUT_EXAMPLE_MAJOR_AMOUNT + LOCALE_DECIMAL_PROBE_FRACTION);
  return parts.find((part) => part.type === "decimal")?.value ?? DEFAULT_DECIMAL_SEPARATOR;
}

function buildPartialMoneyPattern(exponent: number, decimalSeparator = DEFAULT_DECIMAL_SEPARATOR): RegExp {
  if (exponent === ZERO_MINOR_UNIT_EXPONENT) {
    return /^\d*$/u;
  }

  const escapedSeparator = escapeRegExp(decimalSeparator);
  return new RegExp(`^\\d*(?:${escapedSeparator}\\d{0,${exponent}})?$`, "u");
}

function buildCompleteMoneyPattern(exponent: number, decimalSeparator = DEFAULT_DECIMAL_SEPARATOR): RegExp {
  if (exponent === ZERO_MINOR_UNIT_EXPONENT) {
    return /^\d+$/u;
  }

  const escapedSeparator = escapeRegExp(decimalSeparator);
  return new RegExp(`^\\d+(?:${escapedSeparator}\\d{1,${exponent}})?$`, "u");
}

/** Normalizes locale decimal input to dot for internal parsing; rejects mixed separators. */
function normalizeMoneyDecimalSeparator(input: string, locale?: string): string | undefined {
  const compact = compactMoneyInput(input);
  const primarySeparator = locale === undefined ? DEFAULT_DECIMAL_SEPARATOR : getLocaleDecimalSeparator(locale);
  const alternateSeparator = primarySeparator === "," ? "." : ",";
  const hasPrimary = compact.includes(primarySeparator);
  const hasAlternate = compact.includes(alternateSeparator);

  if (hasPrimary && hasAlternate) {
    return undefined;
  }

  if (hasPrimary) {
    return compact.replaceAll(primarySeparator, DEFAULT_DECIMAL_SEPARATOR);
  }

  if (hasAlternate) {
    return compact.replaceAll(alternateSeparator, DEFAULT_DECIMAL_SEPARATOR);
  }

  return compact;
}

/** Whether the string may still be edited for the given ISO currency. */
export function isPartialMoneyInput(input: string, currencyCode: string, locale?: string): boolean {
  const { minorUnitExponent } = getCurrencyDefinition(currencyCode);
  const normalized = normalizeMoneyDecimalSeparator(input, locale);
  if (normalized === undefined) {
    return false;
  }

  return buildPartialMoneyPattern(minorUnitExponent, DEFAULT_DECIMAL_SEPARATOR).test(normalized);
}

/** Whether the value is a complete major-unit amount for the given ISO currency. */
export function isCompleteMoneyInput(input: string, currencyCode: string, locale?: string): boolean {
  const { minorUnitExponent } = getCurrencyDefinition(currencyCode);
  const compact = compactMoneyInput(input);
  const primarySeparator = locale === undefined ? DEFAULT_DECIMAL_SEPARATOR : getLocaleDecimalSeparator(locale);
  const alternateSeparator = primarySeparator === "," ? "." : ",";
  const normalized = normalizeMoneyDecimalSeparator(input, locale);
  if (normalized === undefined || normalized === EMPTY_INPUT) {
    return false;
  }

  if (minorUnitExponent > ZERO_MINOR_UNIT_EXPONENT && (compact.endsWith(primarySeparator) || compact.endsWith(alternateSeparator))) {
    return false;
  }

  return buildCompleteMoneyPattern(minorUnitExponent, DEFAULT_DECIMAL_SEPARATOR).test(normalized);
}

function minorUnitsPerMajorFromExponent(exponent: number): number {
  return MINOR_UNITS_BASE ** exponent;
}

function parseCompactMoneyToMinor(compact: string, minorUnitExponent: number): number {
  const minorPerMajor = minorUnitsPerMajorFromExponent(minorUnitExponent);

  if (minorUnitExponent === ZERO_MINOR_UNIT_EXPONENT) {
    return Number.parseInt(compact, DECIMAL_RADIX) * minorPerMajor;
  }

  const dotIndex = compact.indexOf(".");
  const integerPart = dotIndex === NO_DECIMAL_INDEX ? compact : compact.slice(SLICE_START, dotIndex);
  const fractionPart = dotIndex === NO_DECIMAL_INDEX ? "" : compact.slice(dotIndex + DECIMAL_OFFSET);

  const majorUnits = Number.parseInt(integerPart, DECIMAL_RADIX);
  const minorUnits =
    fractionPart === ""
      ? ZERO_FRACTION_MINOR
      : Number.parseInt(
          fractionPart.length === SINGLE_FRACTION_DIGIT
            ? `${fractionPart}${"0".repeat(minorUnitExponent - FRACTION_PAD_OFFSET)}`
            : fractionPart.slice(SLICE_START, minorUnitExponent),
          DECIMAL_RADIX
        );

  return majorUnits * minorPerMajor + minorUnits;
}

/** Returns minor units for a complete amount; `undefined` when invalid. Empty → 0. */
export function parseMoneyInputToMinorUnits(input: string, currencyCode: string, locale?: string): number | undefined {
  const trimmed = input.trim();
  if (trimmed === EMPTY_INPUT) {
    return ZERO_MINOR;
  }

  const normalized = normalizeMoneyDecimalSeparator(trimmed, locale);
  if (normalized === undefined || !isCompleteMoneyInput(trimmed, currencyCode, locale)) {
    return undefined;
  }

  const { minorUnitExponent } = getCurrencyDefinition(currencyCode);
  return parseCompactMoneyToMinor(normalized, minorUnitExponent);
}

/** Major-unit string with dot separator (legacy / non-locale contexts). */
export function formatMinorUnitsToNumberInput(minorUnits: number, currencyCode: string): string {
  const { minorUnitExponent } = getCurrencyDefinition(currencyCode);
  const major = minorUnits / minorUnitsPerMajor(currencyCode);
  return major.toFixed(minorUnitExponent);
}

/** Locale-aware major-unit string for money inputs (no grouping, fixed fractional width). */
export function formatMinorUnitsToMoneyInput(minorUnits: number, currencyCode: string, locale: string): string {
  return formatMinorUnitsAsDecimal(minorUnits, { currencyCode, locale, useGrouping: false });
}

/** Keeps only characters that form a valid in-progress money string. */
function coercePartialMoneyInput(input: string, currencyCode: string, locale?: string): string {
  const compact = compactMoneyInput(input);
  let built = EMPTY_INPUT;

  for (const char of compact) {
    const next = built + char;
    if (isPartialMoneyInput(next, currencyCode, locale)) {
      built = next;
    }
  }

  return built;
}

/** Coerces a stored form value for display using locale-aware formatting on blur. */
export function toNumberMoneyInputValue(value: string, currencyCode: string, locale?: string): string {
  if (value === EMPTY_INPUT) {
    return EMPTY_INPUT;
  }

  const coerced = coercePartialMoneyInput(value, currencyCode, locale);
  if (coerced === EMPTY_INPUT) {
    return EMPTY_INPUT;
  }

  const normalized = normalizeMoneyDecimalSeparator(coerced, locale);
  if (normalized === undefined) {
    return coerced;
  }

  const minor = parseMoneyInputToMinorUnits(coerced, currencyCode, locale);
  if (minor === undefined) {
    return coerced;
  }

  if (locale === undefined) {
    return formatMinorUnitsToNumberInput(minor, currencyCode);
  }

  return formatMinorUnitsToMoneyInput(minor, currencyCode, locale);
}

/**
 * Formats minor units as a localized currency string.
 * @example formatMinorUnits(24900, "PLN", "pl") → `"249,00 zł"`
 */
export function formatMinorUnits(amountInMinorUnits: number, currencyCode: string, locale: string): string {
  const definition = getCurrencyDefinition(currencyCode);
  const major = amountInMinorUnits / minorUnitsPerMajor(definition.code);
  return new Intl.NumberFormat(locale, { currency: definition.code, style: "currency" }).format(major);
}

/** Formats minor units as a localized decimal (no currency symbol). */
export function formatMinorUnitsAsDecimal(
  amountInMinorUnits: number,
  { currencyCode, locale, useGrouping = false }: FormatMinorUnitsAsDecimalOptions
): string {
  const definition = getCurrencyDefinition(currencyCode);
  const major = amountInMinorUnits / minorUnitsPerMajor(definition.code);
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: definition.minorUnitExponent,
    minimumFractionDigits: definition.minorUnitExponent,
    useGrouping
  }).format(major);
}

/**
 * Formats an amount expressed in minor units (grosze / cents) as a localized
 * currency string, e.g. `formatPrice(24900, "PLN", "pl")` → `"249,00 zł"`.
 */
export function formatPrice(amountInMinorUnits: number, currency: string, locale: string): string {
  const normalized = currency.toUpperCase();
  if (normalized === STORE_CURRENCY_CODE) {
    return formatMinorUnits(amountInMinorUnits, normalized, locale);
  }

  return new Intl.NumberFormat(locale, { currency: normalized, style: "currency" }).format(
    amountInMinorUnits / minorUnitsPerMajor(normalized)
  );
}

export { formatMinorUnitsToNumberInput as formatCentsToNumberMoneyInput };

/** @deprecated Use {@link minorUnitsPerMajor} with an ISO currency code. */
export const CENTS_PER_UNIT = 100;

/** Minimum sell price in minor units for the store currency (Stripe floor). */
export const MIN_PRICE_CENTS = getMinPriceMinorUnits(STORE_CURRENCY_CODE);

/** Store-currency alias for {@link getMoneyInputStep}. */
export const MONEY_INPUT_STEP = getMoneyInputStep(STORE_CURRENCY_CODE);

/** Parses money input in the store currency; invalid syntax maps to 0. */
export function parseMoneyInputToCents(input: string): number {
  return parseMoneyInputToMinorUnits(input, STORE_CURRENCY_CODE) ?? ZERO_MINOR;
}

/** Strict parse in the store currency: `undefined` when syntax is invalid, 0 when empty. */
export function parseMoneyInputToCentsStrict(input: string): number | undefined {
  return parseMoneyInputToMinorUnits(input, STORE_CURRENCY_CODE);
}

export function formatCentsToMoneyInput(cents: number, locale?: string): string {
  if (locale === undefined) {
    return formatMinorUnitsToNumberInput(cents, STORE_CURRENCY_CODE);
  }

  return formatMinorUnitsToMoneyInput(cents, STORE_CURRENCY_CODE, locale);
}

export function isSellPriceCentsValid(cents: number): boolean {
  return cents >= MIN_PRICE_CENTS;
}

/** Compare-at must be empty or not less than sell price (in minor units). */
export function isCompareAtValid(priceMinor: number, compareAtInput: string, currencyCode = STORE_CURRENCY_CODE): boolean {
  if (compareAtInput.trim() === EMPTY_INPUT) {
    return true;
  }

  const compareAtMinor = parseMoneyInputToMinorUnits(compareAtInput, currencyCode);
  if (compareAtMinor === undefined) {
    return false;
  }

  return compareAtMinor >= priceMinor;
}

export function centsToDisplayAmount(cents: number, currencyCode = STORE_CURRENCY_CODE): number {
  return cents / minorUnitsPerMajor(currencyCode);
}

/** @deprecated Use {@link parseMoneyInputToMinorUnits}. */
export const parsePlnMoneyInputToCents = parseMoneyInputToCentsStrict;

/** @deprecated Use {@link isPartialMoneyInput}. */
export const isPartialPlnMoneyInput = (input: string): boolean => isPartialMoneyInput(input, STORE_CURRENCY_CODE);

/** @deprecated Use {@link isCompleteMoneyInput}. */
export const isCompletePlnMoneyInput = (input: string): boolean => isCompleteMoneyInput(input, STORE_CURRENCY_CODE);

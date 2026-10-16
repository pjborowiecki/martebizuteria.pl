import { type Nodes } from "mdast"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { formatCountryName } from "~/src/modules/_core/utils/country-name"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"
import { type SellerDetailsField } from "~/src/modules/store-setting/store-setting.constants"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

export const SELLER_PLACEHOLDER_DIRECTIVE = "seller"

export const SELLER_PLACEHOLDERS = [
  "legalName",
  "street",
  "postalCode",
  "city",
  "country",
  "nip",
  "regon",
  "email",
  "emailLink",
  "phone",
  "phoneLink",
] as const

export type SellerPlaceholder = (typeof SELLER_PLACEHOLDERS)[number]

export type Directive = Extract<Nodes, { readonly type: "containerDirective" | "leafDirective" | "textDirective" }>

const SELLER_PLACEHOLDER_FIELDS = {
  city: "city",
  country: "countryCode",
  email: "email",
  emailLink: "email",
  legalName: "legalName",
  nip: "nip",
  phone: "phone",
  phoneLink: "phone",
  postalCode: "postalCode",
  regon: "regon",
  street: "street",
} as const satisfies Record<SellerPlaceholder, SellerDetailsField>

const SELLER_PLACEHOLDER_PATTERN = /(?<!\\):seller\[(?<name>[^\]\n]*)\]/gu

export const isSellerPlaceholder = (value: string): value is SellerPlaceholder => Object.hasOwn(SELLER_PLACEHOLDER_FIELDS, value)

export const readSellerPlaceholder = (directive: Directive): SellerPlaceholder | undefined => {
  const [label, ...rest] = directive.children

  return directive.type === "textDirective" &&
    directive.name === SELLER_PLACEHOLDER_DIRECTIVE &&
    rest.length === 0 &&
    label?.type === "text" &&
    isSellerPlaceholder(label.value)
    ? label.value
    : undefined
}

export const findSellerPlaceholders = (body: string): string[] =>
  [...body.matchAll(SELLER_PLACEHOLDER_PATTERN)].flatMap((match) => match.slice(1))

export const removeSellerPlaceholders = (body: string): string => body.replaceAll(SELLER_PLACEHOLDER_PATTERN, "")

export const formatSellerPlaceholder = (placeholder: SellerPlaceholder, seller: StoreSetting["sellerDetails"], locale: string): string =>
  placeholder === "country" ? formatCountryName(seller.countryCode, locale) : seller[SELLER_PLACEHOLDER_FIELDS[placeholder]]

export const findLocalesShowingSellerFields = (bodies: ContentPage["localeMap"], fields: readonly string[]): SupportedLocale[] =>
  I18N.SUPPORTED_LOCALES.filter((locale) =>
    findSellerPlaceholders(bodies[locale]).some(
      (placeholder) => isSellerPlaceholder(placeholder) && fields.includes(SELLER_PLACEHOLDER_FIELDS[placeholder]),
    ),
  )

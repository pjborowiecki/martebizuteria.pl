import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

import { formatCountryName } from "~/src/modules/_core/utils/country-name"
import {
  CONTENT_PAGE_HANDLES,
  CONTENT_PAGE_LINK_PATTERN,
  type ContentPageHandle,
  SELLER_PLACEHOLDER_DIRECTIVE,
  type SellerPlaceholder,
} from "~/src/modules/content-page/content-page.constants"
import { type ContentPage, type Directive } from "~/src/modules/content-page/content-page.types"
import { type SellerDetailsField } from "~/src/modules/store-setting/store-setting.constants"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

export const isContentPageHandle = (value: string): value is ContentPageHandle =>
  (CONTENT_PAGE_HANDLES as readonly string[]).includes(value)

export const reviseChangedLocales = (
  current: Pick<ContentPage["select"], "bodies" | "revisedAts" | "titles">,
  next: Pick<ContentPage["select"], "bodies" | "titles">,
): ContentPage["revisionMap"] => {
  const now = Date.now()

  return Object.fromEntries(
    I18N.SUPPORTED_LOCALES.map((locale) => [
      locale,
      current.titles[locale] === next.titles[locale] && current.bodies[locale] === next.bodies[locale] ? current.revisedAts[locale] : now,
    ]),
  )
}

export const revisionDateFor = (revisedAts: ContentPage["revisionMap"], locale: string): Date =>
  new Date(revisedAts[isSupportedLocale(locale) ? locale : I18N.DEFAULT_LOCALE])

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

const MARKDOWN_IMAGE = /(?<!\\)!\[/u

const MARKDOWN_LINK_TARGET = /(?<!\\)\]\((?<href>[^)\s]*)\)/gu

const ESCAPED_PUNCTUATION = /\\(?<character>[!-/:-@[-`{-~])/gu

const isPermittedHref = (href: string | undefined, linkPattern: RegExp): boolean =>
  href !== undefined && linkPattern.test(href.replaceAll(ESCAPED_PUNCTUATION, "$<character>"))

export const hasOnlyMarkdownLinksMatching =
  (linkPattern: RegExp) =>
  (body: string): boolean =>
    !MARKDOWN_IMAGE.test(body) &&
    [...body.matchAll(MARKDOWN_LINK_TARGET)].every((match) => isPermittedHref(match.groups?.["href"], linkPattern))

const hasOnlyContentPageLinks = hasOnlyMarkdownLinksMatching(CONTENT_PAGE_LINK_PATTERN)

export const hasOnlyPublishableMarkdown = (body: string): boolean =>
  findSellerPlaceholders(body).every((placeholder) => isSellerPlaceholder(placeholder)) &&
  hasOnlyContentPageLinks(removeSellerPlaceholders(body))

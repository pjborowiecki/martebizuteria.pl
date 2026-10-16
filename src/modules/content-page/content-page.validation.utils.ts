import { CONTENT_PAGE_LINK_PATTERN } from "~/src/modules/content-page/content-page.constants"
import {
  findSellerPlaceholders,
  isSellerPlaceholder,
  removeSellerPlaceholders,
} from "~/src/modules/content-page/content-page.seller-placeholders"

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

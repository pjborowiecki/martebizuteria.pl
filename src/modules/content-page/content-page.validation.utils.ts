import { CONTENT_PAGE_LINK_PATTERN } from "~/src/modules/content-page/content-page.constants"

const MARKDOWN_IMAGE = /(?<!\\)!\[/u

const MARKDOWN_LINK_TARGET = /(?<!\\)\]\((?<href>[^)\s]*)\)/gu

const isPermittedHref = (href: string | undefined, linkPattern: RegExp): boolean => href !== undefined && linkPattern.test(href)

export const hasOnlyMarkdownLinksMatching =
  (linkPattern: RegExp) =>
  (body: string): boolean =>
    !MARKDOWN_IMAGE.test(body) &&
    [...body.matchAll(MARKDOWN_LINK_TARGET)].every((match) => isPermittedHref(match.groups?.["href"], linkPattern))

export const hasOnlyPublishableMarkdown = hasOnlyMarkdownLinksMatching(CONTENT_PAGE_LINK_PATTERN)

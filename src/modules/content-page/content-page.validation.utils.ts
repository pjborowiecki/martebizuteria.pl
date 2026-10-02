import { CONTENT_PAGE_LINK_PATTERN } from "~/src/modules/content-page/content-page.constants"

const MARKDOWN_IMAGE = /(?<!\\)!\[/u

const MARKDOWN_LINK_TARGET = /(?<!\\)\]\((?<href>[^)\s]*)\)/gu

const isPermittedHref = (href: string | undefined): boolean => href !== undefined && CONTENT_PAGE_LINK_PATTERN.test(href)

export const hasOnlyPublishableMarkdown = (body: string): boolean =>
  !MARKDOWN_IMAGE.test(body) && [...body.matchAll(MARKDOWN_LINK_TARGET)].every((match) => isPermittedHref(match.groups?.["href"]))

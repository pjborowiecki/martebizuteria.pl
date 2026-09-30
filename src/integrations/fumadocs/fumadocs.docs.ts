import { type ReactNode } from "react"

import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { docs } from "collections/server"
import { type Folder, type Item, type Node } from "fumadocs-core/page-tree"
import { loader } from "fumadocs-core/source"
import zod from "zod/v4"

import { i18n } from "~/src/integrations/fumadocs/fumadocs.i18n"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localeField } from "~/src/modules/_core/utils/zod-fields"

import { ROUTES } from "~/src/routes"

export const docsSource = loader({
  baseUrl: ROUTES.DOCS,
  i18n,
  source: docs.toFumadocsSource(),
})

export type DocsPage = NonNullable<ReturnType<typeof docsSource.getPage>>

export interface DocsNavigationLink {
  readonly splat: string
  readonly title: string
}

export interface DocsNavigationSection {
  readonly links: readonly DocsNavigationLink[]
  readonly title: string
}

const DOCS_URL_PREFIX = `${ROUTES.DOCS}/`

const isPageNode = (node: Node): node is Item => node.type === "page"

const isFolderNode = (node: Node): node is Folder => node.type === "folder"

const nodeText = (name: ReactNode): string => (typeof name === "string" ? name : "")

export const docsSplatOf = (url: string): string => (url.startsWith(DOCS_URL_PREFIX) ? url.slice(DOCS_URL_PREFIX.length) : "")

const toNavigationLink = (item: Item): DocsNavigationLink => ({ splat: docsSplatOf(item.url), title: nodeText(item.name) })

const folderPages = (folder: Folder): Item[] => [
  ...(folder.index === undefined ? [] : [folder.index]),
  ...folder.children.filter(isPageNode),
]

const toNavigationSection = (folder: Folder): DocsNavigationSection => ({
  links: folderPages(folder).map((item) => toNavigationLink(item)),
  title: nodeText(folder.name),
})

export const buildDocsNavigation = (locale: string): DocsNavigationSection[] =>
  docsSource
    .getPageTree(locale)
    .children.filter(isFolderNode)
    .map((folder) => toNavigationSection(folder))

const getDocsNavigation = createServerFn({ method: "GET" })
  .validator(localeField)
  .handler(({ data: locale }) => ({ sections: buildDocsNavigation(locale) }))

export const loadDocsNavigation = () => getDocsNavigation({ data: getCurrentLocale() })

const docsSlugsField = zod.string().array()

export const docsSlugsOf = (splat: string | undefined): string[] =>
  splat === undefined || splat === "" ? [] : splat.split("/").filter((segment) => segment !== "")

const getDocsPage = createServerFn({ method: "GET" })
  .validator(zod.object({ locale: localeField, slugs: docsSlugsField }))
  .handler(({ data: { locale, slugs } }) => {
    const page = docsSource.getPage(slugs, locale)
    if (!page) {
      throw notFound()
    }

    return {
      description: page.data.description ?? "",
      path: page.path,
      title: page.data.title,
    }
  })

export const loadDocsPage = async (splat?: string) => {
  const [{ docsContent }, page] = await Promise.all([
    import("~/src/presentation/components/custom/docs-content"),
    getDocsPage({ data: { locale: getCurrentLocale(), slugs: docsSlugsOf(splat) } }),
  ])
  await docsContent.preload(page.path)

  return page
}

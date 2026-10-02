import { type JSX, useMemo } from "react"

import { ChevronRight, FileText } from "lucide-react"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { CONTENT_PAGE_PATHS } from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "~/src/presentation/components/shadcn/item"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const ContentPageListItem = ({ page }: Readonly<{ page: ContentPage["adminListItem"] }>): JSX.Element => {
  const t = useTranslations("pages.admin.content")
  const format = useFormatter()
  const locale = useLocale()
  const params = useMemo(() => ({ handle: page.handle }), [page.handle])
  const link = useMemo(() => <LocalizedLink params={params} to={ROUTES.ADMIN_CONTENT_PAGE} />, [params])

  return (
    <li>
      <Item className="rounded-none px-5 py-4" render={link}>
        <ItemMedia variant="icon">
          <FileText className="size-4 text-muted-foreground" strokeWidth={1.5} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="text-sm">{resolveLocalizedString(page.titles, locale)}</ItemTitle>
          <ItemDescription>
            <code className="font-mono">{CONTENT_PAGE_PATHS[page.handle]}</code>
            {" · "}
            {t("list.updated", { date: format.dateTime(page.updatedAt, { dateStyle: "medium", timeStyle: "short" }) })}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <ChevronRight className="size-4 text-muted-foreground" strokeWidth={1.5} />
        </ItemActions>
      </Item>
    </li>
  )
}

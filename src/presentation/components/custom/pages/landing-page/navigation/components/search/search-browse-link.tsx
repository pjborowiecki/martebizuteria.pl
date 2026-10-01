import { type JSX, useMemo } from "react"

import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const SearchBrowseLink = ({
  item,
  onNavigate,
}: Readonly<{
  item: StorefrontSearch["trendingItem"]
  onNavigate: () => void
}>): JSX.Element => {
  const params = useMemo(() => ({ handle: item.handle }), [item.handle])
  const route = item.type === "category" ? ROUTES.CATEGORY : ROUTES.COLLECTION

  return (
    <LocalizedLink className={chipClassName} params={params} to={route} onClick={onNavigate}>
      {item.label}
    </LocalizedLink>
  )
}

const chipClassName =
  "rounded-full border border-border/80 px-5 py-2.5 text-[11px] tracking-[0.12em] text-muted-foreground transition-all hover:border-foreground hover:text-foreground"

import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"

import { SearchBrowseLink } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/search/search-browse-link"

export const SearchBrowse = ({
  items,
  onNavigate,
}: Readonly<{
  items: readonly StorefrontSearch["trendingItem"][]
  onNavigate: () => void
}>): JSX.Element | undefined => {
  const t = useTranslations("components.custom.navigation")
  if (items.length === 0) {
    return undefined
  }

  return (
    <nav aria-labelledby="search-browse" className="space-y-6">
      <h2 className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase" id="search-browse">
        {t("searchOverlay.browse")}
      </h2>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <SearchBrowseLink key={`${item.type}-${item.handle}`} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  )
}

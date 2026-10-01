import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { SearchResultItem } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/search/search-result-item"
import { type SearchResult } from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-search-overlay-logic"

export const SearchResultGroup = ({
  items,
  onNavigate,
  type,
}: Readonly<{
  items: readonly SearchResult[]
  onNavigate: () => void
  type: SearchResult["type"]
}>): JSX.Element => {
  const t = useTranslations("components.custom.navigation")

  return (
    <section aria-labelledby={`search-group-${type}`}>
      <h2 className="mb-4 text-[10px] tracking-[0.28em] text-muted-foreground uppercase" id={`search-group-${type}`}>
        {t(SECTION_LABEL_KEYS[type])}
      </h2>
      <ul className="grid gap-px">
        {items.map((item) => (
          <SearchResultItem key={`${item.type}:${item.params?.handle ?? item.to}`} item={item} onNavigate={onNavigate} />
        ))}
      </ul>
    </section>
  )
}

const SECTION_LABEL_KEYS = {
  category: "searchOverlay.sectionCategories",
  collection: "searchOverlay.sectionCollections",
  page: "searchOverlay.sectionPages",
  product: "searchOverlay.sectionProducts",
} as const

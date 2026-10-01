import { type JSX } from "react"

import { cn } from "cn"

import { SearchResultGroup } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/search/search-result-group"
import { SearchViewAllLink } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/search/search-view-all-link"
import { type SearchResultGroups } from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-search-overlay-logic"

export const SearchResults = ({
  grouped,
  onNavigate,
  stale,
  term,
}: Readonly<{
  grouped: SearchResultGroups
  onNavigate: () => void
  stale: boolean
  term: string
}>): JSX.Element => {
  const groups = RESULT_GROUP_ORDER.filter((type) => grouped[type].length > 0)

  return (
    <div className={cn("space-y-10 transition-opacity duration-300", stale && "opacity-50")} aria-busy={stale}>
      {groups.map((type) => (
        <SearchResultGroup key={type} items={grouped[type]} onNavigate={onNavigate} type={type} />
      ))}
      <SearchViewAllLink onClick={onNavigate} term={term} />
    </div>
  )
}

const RESULT_GROUP_ORDER = ["product", "category", "collection", "page"] as const

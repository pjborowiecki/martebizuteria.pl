import { type JSX, useCallback } from "react"

import { ArrowRight } from "lucide-react"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { useNavigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider"
import { type SearchResult } from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-search-overlay-logic"

const ResultThumbnail = ({ image, name }: Readonly<{ image: string | undefined; name: string }>): JSX.Element => {
  if (image === undefined) {
    return <div className="size-14 shrink-0 lg:size-16" />
  }

  return (
    <div className="relative size-14 shrink-0 overflow-hidden bg-secondary lg:size-16">
      <Image
        alt={name}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        height={128}
        sizes="64px"
        src={image}
        width={128}
      />
    </div>
  )
}

export const SearchResultItem = ({
  item,
  onNavigate,
}: Readonly<{
  item: SearchResult
  onNavigate: () => void
}>): JSX.Element => {
  const { dismissMenuForRouteNavigation } = useNavigation()
  const handleNavigate = useCallback(() => {
    dismissMenuForRouteNavigation()
    onNavigate()
  }, [dismissMenuForRouteNavigation, onNavigate])

  return (
    <li>
      <LocalizedLink className={rowClassName} to={item.to} params={item.params} onClick={handleNavigate}>
        <ResultThumbnail image={item.image} name={item.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-base tracking-wide lg:text-lg">{item.name}</span>
          {item.detail !== undefined && (
            <span className="mt-0.5 block truncate text-[11px] tracking-[0.15em] text-muted-foreground uppercase">{item.detail}</span>
          )}
        </span>
        <ArrowRight
          className="size-4 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground"
          strokeWidth={1.2}
        />
      </LocalizedLink>
    </li>
  )
}

const rowClassName =
  "group flex items-center gap-4 border-b border-border/40 py-3.5 transition-colors last:border-b-0 hover:bg-secondary/30 lg:gap-5 lg:py-4"

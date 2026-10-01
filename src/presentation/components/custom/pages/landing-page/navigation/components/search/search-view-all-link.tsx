import { type JSX, useMemo } from "react"

import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const SearchViewAllLink = ({
  onClick,
  term,
}: Readonly<{
  onClick: () => void
  term: string
}>): JSX.Element => {
  const t = useTranslations("components.custom.navigation")
  const search = useMemo(() => ({ q: term }), [term])

  return (
    <div className="pt-2 text-center">
      <LocalizedLink
        to={ROUTES.PRODUCTS}
        search={search}
        onClick={onClick}
        className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        {t("searchOverlay.viewAll", { query: term })}
        <ArrowRight className="size-3.5" strokeWidth={1.2} />
      </LocalizedLink>
    </div>
  )
}

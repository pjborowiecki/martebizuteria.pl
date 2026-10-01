import { type JSX } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type SearchStatus } from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-search-overlay-logic"

export const SearchFeedback = ({
  hasResults,
  onRetry,
  status,
}: Readonly<{
  hasResults: boolean
  onRetry: () => void
  status: SearchStatus
}>): JSX.Element | undefined => {
  const t = useTranslations("components.custom.navigation")
  if (status === "error") {
    return (
      <div className="py-12 text-center">
        <p className="font-serif text-xl">{t("searchOverlay.error")}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 text-[11px] tracking-[0.2em] text-muted-foreground uppercase underline underline-offset-4 transition-colors hover:text-foreground"
        >
          {t("searchOverlay.retry")}
        </button>
      </div>
    )
  }

  if (status === "empty") {
    return (
      <div className="py-12 text-center">
        <p className="font-serif text-xl">{t("searchOverlay.noResults")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("searchOverlay.noResultsHint")}</p>
      </div>
    )
  }

  if (status === "searching" && !hasResults) {
    return (
      <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground" aria-hidden="true">
        <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
        <span>{t("searchOverlay.searching")}</span>
      </div>
    )
  }

  return undefined
}

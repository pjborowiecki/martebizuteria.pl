import { type JSX } from "react"

import { Loader2, X } from "lucide-react"
import { useTranslations } from "use-intl/react"

export const SearchFieldAction = ({
  hasQuery,
  isSearching,
  onClear,
}: Readonly<{
  hasQuery: boolean
  isSearching: boolean
  onClear: () => void
}>): JSX.Element | undefined => {
  const t = useTranslations("components.custom.navigation")
  if (isSearching) {
    return (
      <Loader2
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
        strokeWidth={1.5}
      />
    )
  }

  if (!hasQuery) {
    return undefined
  }

  return (
    <button
      type="button"
      aria-label={t("searchOverlay.clear")}
      onClick={onClear}
      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
    >
      <X className="size-4" strokeWidth={1.5} />
    </button>
  )
}

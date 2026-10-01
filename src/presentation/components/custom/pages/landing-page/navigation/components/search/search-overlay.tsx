import { type JSX, type SyntheticEvent, useRef } from "react"

import { Search, X } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { CLIP_CLOSED } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-constants"
import { SearchBrowse } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/search/search-browse"
import { SearchFeedback } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/search/search-feedback"
import { SearchFieldAction } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/search/search-field-action"
import { SearchResults } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/search/search-results"
import { useSearchOverlayLogic } from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-search-overlay-logic"

export const SearchOverlay = (): JSX.Element => {
  const t = useTranslations("components.custom.navigation")
  const overlayRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    browseItems,
    grouped,
    handleClearQuery,
    handleClose,
    handleQueryChange,
    handleRetry,
    handleSubmit,
    query,
    results,
    status,
    statusMessage,
    term,
  } = useSearchOverlayLogic(overlayRef, inputRef)
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault()
    handleClose()
  }

  return (
    <dialog
      ref={overlayRef}
      aria-label={t("search")}
      aria-modal="true"
      className="fixed inset-0 z-300 m-0 h-dvh max-h-none w-screen max-w-none flex-col border-none bg-background/98 p-0 text-foreground backdrop-blur-xl open:flex"
      onCancel={handleCancel}
      style={OVERLAY_STYLE}
    >
      <div className="mx-auto flex w-full max-w-400 items-center justify-between px-6 py-5 lg:px-12">
        <p className="font-serif text-sm tracking-wide">{t("brand")}</p>
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {t("searchOverlay.close")}
          <X className="size-4" strokeWidth={1.2} />
        </button>
      </div>

      <Separator className="bg-border/50" />

      <form
        className="search-bar mx-auto w-full max-w-400 px-6 pt-10 pb-8 lg:px-12 lg:pt-16 lg:pb-10"
        role="search"
        onSubmit={handleSubmit}
      >
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-0 size-5 -translate-y-1/2 text-muted-foreground/60 lg:size-6"
            strokeWidth={1.2}
          />
          <input
            ref={inputRef}
            type="search"
            aria-label={t("searchOverlay.placeholder")}
            autoComplete="off"
            className="w-full border-b border-transparent bg-transparent py-3 pr-10 pl-9 font-serif text-3xl text-foreground placeholder:text-muted-foreground/40 focus:border-foreground/20 focus:outline-none lg:pl-11 lg:text-5xl"
            enterKeyHint="search"
            onChange={handleQueryChange}
            placeholder={t("searchOverlay.placeholder")}
            spellCheck={false}
            value={query}
          />
          <SearchFieldAction hasQuery={query !== ""} isSearching={status === "searching"} onClear={handleClearQuery} />
        </div>
      </form>

      <div className="search-content flex-1 overflow-y-auto" data-lenis-prevent>
        <div className="mx-auto max-w-400 px-6 pb-20 lg:px-12">
          <p aria-live="polite" className="sr-only" role="status">
            {statusMessage}
          </p>
          {status === "idle" && <SearchBrowse items={browseItems} onNavigate={handleClose} />}
          <SearchFeedback hasResults={results.length > 0} onRetry={handleRetry} status={status} />
          {results.length > 0 && <SearchResults grouped={grouped} onNavigate={handleClose} stale={status === "searching"} term={term} />}
        </div>
      </div>
    </dialog>
  )
}

const OVERLAY_STYLE = { clipPath: CLIP_CLOSED }

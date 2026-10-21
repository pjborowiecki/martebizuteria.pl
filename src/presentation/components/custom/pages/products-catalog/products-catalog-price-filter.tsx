import { type ChangeEvent, type FocusEvent, type JSX, type KeyboardEvent, useCallback, useEffect, useId, useState } from "react"

import { useTranslations } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { STOREFRONT_SEARCH_DEBOUNCE_MS } from "~/src/modules/storefront-search/storefront-search.constants"
import { type StorefrontProductsSearch } from "~/src/modules/storefront-search/storefront-search.zod"

import { useDebounce } from "~/src/hooks/use-debounce"

const formatPrice = (price: number | undefined): string => (price === undefined ? "" : String(price))

const parsePrice = (text: string): number | undefined => {
  if (text.trim() === "") {
    return undefined
  }

  const price = Number(text)
  if (!Number.isFinite(price) || price < 0) {
    return undefined
  }

  return price
}

const PriceField = ({
  label,
  onCommit,
  placeholder,
  value,
}: Readonly<{
  label: string
  onCommit: (price: number | undefined) => void
  placeholder: string
  value: number | undefined
}>): JSX.Element => {
  const id = useId()
  const [editing, setEditing] = useState(false)
  const [typedText, setTypedText] = useState("")
  const settledText = useDebounce(typedText, STOREFRONT_SEARCH_DEBOUNCE_MS)
  const commit = useCallback(
    (text: string) => {
      const price = parsePrice(text)
      if (price !== value) {
        onCommit(price)
      }
    },
    [onCommit, value],
  )

  useEffect(() => {
    if (editing && settledText === typedText) {
      commit(settledText)
    }
  }, [commit, editing, settledText, typedText])

  const handleFocus = useCallback(() => {
    setTypedText(formatPrice(value))
    setEditing(true)
  }, [value])

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTypedText(event.target.value)
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        commit(event.currentTarget.value)
      }
    },
    [commit],
  )

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      commit(event.currentTarget.value)
      setEditing(false)
    },
    [commit],
  )

  const shownText = editing ? typedText : formatPrice(value)

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        inputMode="numeric"
        placeholder={placeholder}
        aria-label={label}
        value={shownText}
        onBlur={handleBlur}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className="h-9 w-full border-0 border-b border-border/40 bg-transparent px-0 text-sm transition-colors outline-none placeholder:text-muted-foreground/45 focus:border-foreground pointer-coarse:h-10"
      />
    </div>
  )
}

export const ProductsCatalogPriceFilter = ({ onSearchChange, search }: ProductsCatalogPriceFilterProps): JSX.Element => {
  const t = useTranslations("pages.products.filters")
  const handleMinPriceCommit = useCallback(
    (minPrice: number | undefined) => {
      onSearchChange({ minPrice })
    },
    [onSearchChange],
  )

  const handleMaxPriceCommit = useCallback(
    (maxPrice: number | undefined) => {
      onSearchChange({ maxPrice })
    },
    [onSearchChange],
  )

  return (
    <section className="space-y-4 border-t border-border/30 pt-8">
      <h2 className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("price")}</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <PriceField label={t("minPrice")} onCommit={handleMinPriceCommit} placeholder="0" value={search.minPrice} />
        <PriceField label={t("maxPrice")} onCommit={handleMaxPriceCommit} placeholder={EMPTY_VALUE} value={search.maxPrice} />
      </div>
      <p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{t("priceHint")}</p>
    </section>
  )
}

interface ProductsCatalogPriceFilterProps {
  readonly onSearchChange: (patch: Partial<StorefrontProductsSearch>) => void
  readonly search: StorefrontProductsSearch
}

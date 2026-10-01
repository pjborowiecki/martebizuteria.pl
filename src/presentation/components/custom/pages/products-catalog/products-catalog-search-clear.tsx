import { type JSX } from "react"

import { X } from "lucide-react"
import { useTranslations } from "use-intl/react"

export const ProductsCatalogSearchClear = ({ onClear }: Readonly<{ onClear: () => void }>): JSX.Element => {
  const t = useTranslations("pages.products.search")

  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
    >
      {t("clear")}
      <X className="size-3.5" strokeWidth={1.2} />
    </button>
  )
}

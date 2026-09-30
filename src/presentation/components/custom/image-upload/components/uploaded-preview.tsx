import { type CSSProperties, type JSX, useMemo } from "react"

import { RefreshCw, X } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { Image } from "~/src/presentation/components/custom/image"

export const UploadedPreview = ({ disabled, isUploading, onPick, onRemove, overlaySrc, value }: UploadedPreviewProps): JSX.Element => {
  const t = useTranslations("pages.admin")
  const overlayStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: `url(${overlaySrc})`,
    }),
    [overlaySrc],
  )

  return (
    <div className="group/img relative w-full overflow-hidden rounded-lg border border-border bg-muted">
      <div className="relative aspect-video w-full">
        {value !== "" && !isUploading ? (
          <Image optimize={false} src={value} alt="" width={640} height={360} className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 size-full bg-cover bg-center" style={overlayStyle} />
        )}
      </div>

      {isUploading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
          <Spinner className="size-5 text-white" />
          <span className="text-[12px] font-medium">{t("media.uploading")}</span>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover/img:opacity-100">
          <Button variant="secondary" size="sm" disabled={disabled} onClick={onPick} className="h-8 gap-1.5 text-[12px]">
            <RefreshCw className="size-3.5" strokeWidth={1.5} />
            {t("media.change")}
          </Button>
          <Button variant="secondary" size="sm" disabled={disabled} onClick={onRemove} className="h-8 gap-1.5 text-[12px]">
            <X className="size-3.5" strokeWidth={1.5} />
            {t("media.remove")}
          </Button>
        </div>
      )}
    </div>
  )
}

interface UploadedPreviewProps {
  readonly disabled: boolean
  readonly isUploading: boolean
  readonly onPick: () => void
  readonly onRemove: () => void
  readonly overlaySrc: string
  readonly value: string
}

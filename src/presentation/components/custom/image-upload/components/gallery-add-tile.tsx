import { type ChangeEvent, type DragEvent, type JSX, useCallback, useRef, useState } from "react"

import { cn } from "cn"
import { ImagePlus } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { ACCEPTED_IMAGE_ACCEPT_ATTR } from "~/src/integrations/cloudflare-r2/media.zod"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

export const GalleryAddTile = ({ disabled, isUploading, layout = "grid-tile", onFiles }: GalleryAddTileProps): JSX.Element => {
  const t = useTranslations("pages.admin")
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const openPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files !== null) {
        onFiles([...event.target.files])
      }
      event.target.value = ""
    },
    [onFiles],
  )

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      if (!disabled) {
        setIsDraggingFile(true)
      }
    },
    [disabled],
  )

  const handleDragLeave = useCallback(() => {
    setIsDraggingFile(false)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      setIsDraggingFile(false)
      if (!disabled) {
        onFiles([...event.dataTransfer.files])
      }
    },
    [disabled, onFiles],
  )

  const isDropzone = layout === "dropzone"
  let label = t("media.addMore")
  if (isUploading) {
    label = t("media.uploading")
  } else if (isDropzone) {
    label = t("media.cta")
  }

  const hint = isDropzone ? t("media.hint") : undefined
  const pickerButton = (
    <Button
      variant="outline"
      onClick={openPicker}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      disabled={disabled}
      className={cn(
        "flex-col whitespace-normal shadow-none",
        isDropzone
          ? "h-auto w-full gap-2 rounded-md border border-dashed border-border bg-background px-6 py-9 text-center hover:border-foreground/50 hover:bg-muted/25"
          : "size-full gap-1.5 rounded-lg border-dashed border-border/60 bg-muted/30 p-3 text-center hover:border-foreground/40 hover:bg-muted/50",
        isDraggingFile && (isDropzone ? "border-foreground bg-muted/30" : "border-foreground/60 bg-muted/60"),
      )}
    >
      {isUploading && <Spinner className={cn("text-muted-foreground", isDropzone ? "size-6" : "size-5")} />}
      {!isUploading && (
        <ImagePlus aria-hidden className={cn("text-muted-foreground", isDropzone ? "size-6" : "size-5")} strokeWidth={1.5} />
      )}
      <span className={cn("font-medium text-muted-foreground", isDropzone ? "text-[13px]" : "text-[11px]")}>{label}</span>
      {hint !== undefined && <span className="text-[11px] text-muted-foreground/70">{hint}</span>}
    </Button>
  )

  const fileInput = (
    <Input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_IMAGE_ACCEPT_ATTR}
      multiple
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      disabled={disabled}
      onChange={handleInputChange}
    />
  )

  if (isDropzone) {
    return (
      <div className="w-full">
        {fileInput}
        {pickerButton}
      </div>
    )
  }

  return (
    <li className="aspect-square">
      {fileInput}
      {pickerButton}
    </li>
  )
}

interface GalleryAddTileProps {
  readonly disabled: boolean
  readonly isUploading: boolean
  readonly layout?: "grid-tile" | "dropzone"
  readonly onFiles: (files: readonly File[]) => void
}

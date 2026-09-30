import { type ChangeEvent, type DragEvent, type JSX, useCallback, useEffect, useRef, useState } from "react"

import { cn } from "cn"

import { ACCEPTED_IMAGE_ACCEPT_ATTR } from "~/src/integrations/cloudflare-r2/media.zod"

import { Input } from "~/src/presentation/components/shadcn/input"

import { UploadDropzone } from "~/src/presentation/components/custom/image-upload/components/upload-dropzone"
import { UploadedPreview } from "~/src/presentation/components/custom/image-upload/components/uploaded-preview"
import { useImageUpload } from "~/src/presentation/components/custom/image-upload/hooks/use-image-upload"
import { type ImageUploadBaseProps } from "~/src/presentation/components/custom/image-upload/lib/image-upload.types"

export const ImageUpload = ({
  className,
  disabled = false,
  folder = "uploads",
  invalid = false,
  onChange,
  onUploadingChange,
  value,
}: ImageUploadProps): JSX.Element => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string>()
  const [isDragging, setIsDragging] = useState(false)
  const { isUploading, uploadFiles } = useImageUpload(folder, onUploadingChange)

  useEffect(() => {
    if (localPreview === undefined) {
      return
    }

    return () => {
      URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (file === undefined) {
        return
      }
      setLocalPreview(URL.createObjectURL(file))
      const [url] = await uploadFiles([file])
      setLocalPreview(undefined)
      if (url !== undefined) {
        onChange(url)
      }
    },
    [uploadFiles, onChange],
  )

  const openPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      void handleFile(event.target.files?.[0])
      event.target.value = ""
    },
    [handleFile],
  )

  const handleRemove = useCallback(() => {
    setLocalPreview(undefined)
    onChange("")
  }, [onChange])

  const isBusy = disabled || isUploading
  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      if (!isBusy) {
        setIsDragging(true)
      }
    },
    [isBusy],
  )

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      setIsDragging(false)
      if (!isBusy) {
        void handleFile(event.dataTransfer.files[0])
      }
    },
    [handleFile, isBusy],
  )

  const hasImage = value !== "" || (isUploading && localPreview !== undefined)
  const overlaySrc = localPreview ?? value

  return (
    <div className={cn("w-full max-w-[320px]", className)}>
      <Input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={isBusy}
        onChange={handleInputChange}
      />

      {hasImage ? (
        <UploadedPreview
          disabled={disabled}
          isUploading={isUploading}
          onPick={openPicker}
          onRemove={handleRemove}
          overlaySrc={overlaySrc}
          value={value}
        />
      ) : (
        <UploadDropzone
          disabled={isBusy}
          invalid={invalid}
          isDragging={isDragging}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPick={openPicker}
        />
      )}
    </div>
  )
}

interface ImageUploadProps extends ImageUploadBaseProps {
  readonly invalid?: boolean
  readonly onChange: (url: string) => void
  readonly value: string
}

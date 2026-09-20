import { useCallback, useEffect, useState } from "react"

import { toast } from "sonner"
import { useTranslations } from "use-intl"

import { uploadImageFn } from "~/src/integrations/cloudflare-r2/media.mutations"
import { MAX_IMAGE_BYTES, type MediaFolder, isAcceptedImageMime } from "~/src/integrations/cloudflare-r2/media.zod"

import { EMPTY_COUNT, SINGLE_INCREMENT } from "~/src/presentation/components/custom/image-upload/constants"

export const useImageUpload = (folder: MediaFolder, onUploadingChange?: (uploading: boolean) => void): UseImageUploadResult => {
  const t = useTranslations("pages.admin")
  const [pendingCount, setPendingCount] = useState(EMPTY_COUNT)
  const isUploading = pendingCount > EMPTY_COUNT
  useEffect(() => {
    onUploadingChange?.(isUploading)
  }, [isUploading, onUploadingChange])
  const validate = useCallback(
    (file: File): boolean => {
      if (!isAcceptedImageMime(file.type)) {
        toast.error(t("media.errorTitle"), {
          description: t("media.errorInvalidType"),
        })
        return false
      }
      if (file.size === EMPTY_COUNT || file.size > MAX_IMAGE_BYTES) {
        toast.error(t("media.errorTitle"), {
          description: t("media.errorTooLarge"),
        })
        return false
      }
      return true
    },
    [t],
  )
  const uploadFiles = useCallback(
    async (files: readonly File[]): Promise<readonly string[]> => {
      const valid = files.filter((file) => validate(file))
      if (valid.length === EMPTY_COUNT) {
        return []
      }
      setPendingCount((count) => count + valid.length)
      try {
        const settled = await Promise.allSettled(
          valid.map((file) => {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("folder", folder)
            return uploadImageFn({
              data: formData,
            })
          }),
        )
        const urls: string[] = []
        let failed = EMPTY_COUNT
        for (const result of settled) {
          if (result.status === "fulfilled") {
            urls.push(result.value.url)
          } else {
            failed += SINGLE_INCREMENT
          }
        }
        if (failed > EMPTY_COUNT) {
          toast.error(t("media.errorTitle"), {
            description: t("media.errorUpload"),
          })
        }
        return urls
      } finally {
        setPendingCount((count) => count - valid.length)
      }
    },
    [folder, t, validate],
  )
  return {
    isUploading,
    uploadFiles,
  }
}
export interface UseImageUploadResult {
  readonly isUploading: boolean
  /** Returns successful URLs in input order; failed files are skipped and reported by toast. */
  readonly uploadFiles: (files: readonly File[]) => Promise<readonly string[]>
}

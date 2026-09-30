import { useCallback, useEffect, useState } from "react"

import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { uploadImageFn } from "~/src/integrations/cloudflare-r2/media.mutations"
import { MAX_IMAGE_BYTES, type MediaFolder, isAcceptedImageMime } from "~/src/integrations/cloudflare-r2/media.zod"

export const useImageUpload = (folder: MediaFolder, onUploadingChange?: (uploading: boolean) => void): UseImageUploadResult => {
  const t = useTranslations("pages.admin")
  const [pendingCount, setPendingCount] = useState(0)
  const isUploading = pendingCount > 0
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

      if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
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
      if (valid.length === 0) {
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
        let failed = 0
        for (const result of settled) {
          if (result.status === "fulfilled") {
            urls.push(result.value.url)
          } else {
            failed += 1
          }
        }

        if (failed > 0) {
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
  readonly uploadFiles: (files: readonly File[]) => Promise<readonly string[]>
}

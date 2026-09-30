import { type MediaFolder } from "~/src/integrations/cloudflare-r2/media.zod"

export interface GalleryImage {
  readonly id: string
  readonly url: string
}

export interface ImageUploadBaseProps {
  readonly className?: string
  readonly disabled?: boolean
  readonly folder?: MediaFolder
  readonly onUploadingChange?: (uploading: boolean) => void
}

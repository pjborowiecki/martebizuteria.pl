import type { MediaFolder } from "~/src/integrations/cloudflare-r2/media.zod";

/** A single uploaded gallery image. `id` is a stable client key so reordering
 *  and "set as main" survive re-renders independently of the URL. */
export interface GalleryImage {
  readonly id: string;
  readonly url: string;
}

/** Props shared by both upload variants. */
export interface ImageUploadBaseProps {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly folder?: MediaFolder;
  readonly onUploadingChange?: (uploading: boolean) => void;
}

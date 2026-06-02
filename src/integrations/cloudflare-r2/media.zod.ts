/**
 * Shared media-upload contract. These constants are the single source of truth
 * for both client-side validation (the upload widget) and the server mutation,
 * so the two can never drift apart.
 */

export const ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

/** `accept` attribute value for the file input. */
export const ACCEPTED_IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_MIME_TYPES.join(",");

const BYTES_PER_KIB = 1024;
const MAX_IMAGE_MIB = 5;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MIB * BYTES_PER_KIB * BYTES_PER_KIB;

/** Top-level R2 key prefixes, one per media-owning resource. */
export const MEDIA_FOLDERS = ["collections", "products", "categories", "uploads"] as const;

/** Maps an accepted MIME type to the file extension used in the R2 object key. */
export const MIME_EXTENSION: Readonly<Record<string, string>> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export const MEDIA_ERROR_CODES = {
  INVALID_FILE: "INVALID_FILE",
  INVALID_TYPE: "INVALID_TYPE",
  TOO_LARGE: "TOO_LARGE",
  UNAUTHORIZED: "UNAUTHORIZED"
} as const;

export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export function isMediaFolder(value: unknown): value is MediaFolder {
  return typeof value === "string" && (MEDIA_FOLDERS as readonly string[]).includes(value);
}

export function isAcceptedImageMime(value: string): boolean {
  return (ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

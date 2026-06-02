import { createServerFn } from "@tanstack/react-start";

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions";
import { mediaAccessors } from "~/src/integrations/cloudflare-r2/media.accessors";
import {
  MAX_IMAGE_BYTES,
  MEDIA_ERROR_CODES,
  MIME_EXTENSION,
  isAcceptedImageMime,
  isMediaFolder
} from "~/src/integrations/cloudflare-r2/media.zod";

import { getAssetURL } from "~/src/lib/_utils/url";

const EMPTY_SIZE = 0;
const HEX_RADIX = 16;
const HEX_PAIR_LENGTH = 2;

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(HEX_RADIX).padStart(HEX_PAIR_LENGTH, "0");
  }
  return hex;
}

/**
 * Uploads a single image to R2 and returns its public URL. Keys are
 * content-addressed (`<folder>/<sha256>.<ext>`) so identical bytes dedupe to
 * one object and can be served immutably. The returned URL routes through
 * `VITE_R2_URL`, which keeps it on the app's CDN domain so the `Image`
 * component can apply Cloudflare on-the-fly resizing/format optimization.
 */
const uploadImageFn = createServerFn({ method: "POST" })
  .inputValidator((data: FormData) => data)
  .handler(async ({ data }) => {
    await assertAdmin();

    const file = data.get("file");
    if (!(file instanceof File)) {
      throw new TypeError(MEDIA_ERROR_CODES.INVALID_FILE);
    }

    if (!isAcceptedImageMime(file.type)) {
      throw new Error(MEDIA_ERROR_CODES.INVALID_TYPE);
    }

    if (file.size === EMPTY_SIZE || file.size > MAX_IMAGE_BYTES) {
      throw new Error(MEDIA_ERROR_CODES.TOO_LARGE);
    }

    const folderRaw = data.get("folder");
    const folder: string = isMediaFolder(folderRaw) ? folderRaw : "uploads";

    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    const key = `${folder}/${bufferToHex(digest)}.${MIME_EXTENSION[file.type]}`;

    if (!(await mediaAccessors.imageExists(key))) {
      await mediaAccessors.putImage(key, buffer, file.type);
    }

    return { key, url: getAssetURL(key) };
  });

export const mediaMutations = {
  uploadImageFn
};

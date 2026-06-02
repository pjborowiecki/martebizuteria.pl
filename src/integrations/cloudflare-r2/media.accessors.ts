import { imagesBucket } from "~/src/integrations/cloudflare-r2/r2.bucket";

// Content-addressed keys never change, so the public object can be cached
// forever at the edge and in the browser.
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

async function putImage(key: string, data: ArrayBuffer, contentType: string): Promise<void> {
  await imagesBucket.put(key, data, {
    httpMetadata: { cacheControl: IMMUTABLE_CACHE_CONTROL, contentType }
  });
}

async function imageExists(key: string): Promise<boolean> {
  const head = await imagesBucket.head(key);
  return head !== null;
}

async function deleteImage(key: string): Promise<void> {
  await imagesBucket.delete(key);
}

export const mediaAccessors = {
  deleteImage,
  imageExists,
  putImage
};

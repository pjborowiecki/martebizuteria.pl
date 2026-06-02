import { env } from "cloudflare:workers";

const { IMAGES } = env;

if (!(IMAGES instanceof Object)) {
  throw new TypeError("[r2] R2 binding 'IMAGES' is not available. Ensure the 'r2_buckets' binding is configured in wrangler.jsonc.");
}

/** The R2 bucket that backs all uploaded media (binding `IMAGES`). */
export const imagesBucket: R2Bucket = IMAGES;

import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas";

const { DB } = env;

if (!(DB instanceof Object)) {
  throw new TypeError("[drizzle] D1 binding 'DB' is not available. Ensure the 'd1_databases' binding is configured in wrangler.jsonc.");
}

export const db = drizzle(DB, { schema });

type BatchFirstParameter<T extends (...args: never) => unknown> = T extends (first: infer P, ...rest: never[]) => unknown ? P : never;

export type DbBatchInput = BatchFirstParameter<typeof db.batch>;

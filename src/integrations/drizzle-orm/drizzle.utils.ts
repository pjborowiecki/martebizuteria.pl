import { sql } from "drizzle-orm";
import { integer } from "drizzle-orm/sqlite-core";

export const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

const nowMs = sql`(unixepoch() * 1000)`;

export const timestampNow = (name: string) =>
  timestamp(name)
    .default(nowMs)
    .$defaultFn(() => new Date())
    .notNull();

export const timestamps = () => ({
  createdAt: timestampNow("created_at"),
  updatedAt: timestampNow("updated_at").$onUpdateFn(() => new Date())
});

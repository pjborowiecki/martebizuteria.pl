import { pageSchema } from "fumadocs-core/source/schema"
import zod from "zod/v4"

export const legalSchema = pageSchema.extend({
  updated: zod.iso.date(),
})

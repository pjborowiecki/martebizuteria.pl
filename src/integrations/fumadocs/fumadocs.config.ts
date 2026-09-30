import { defineConfig, defineDocs } from "fumadocs-mdx/config"

import { legalSchema } from "./fumadocs.schema"

export const legal = defineDocs({
  dir: "./content/legal",
  docs: {
    schema: legalSchema,
  },
})

export default defineConfig()

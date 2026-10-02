import { describe, expect, it } from "vite-plus/test"

import { docs } from "~/src/integrations/fumadocs/fumadocs.config"

describe("documentation collection", () => {
  it("reads its pages from the documentation content directory", () => {
    expect(docs.docs.dir).toBe("./content/docs")
  })
})

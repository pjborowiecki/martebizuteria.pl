import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

const globalsCss = readFileSync("src/presentation/styles/globals.css", "utf8")

describe("storefront container", () => {
  it("keeps the 16px phone gutter of the header and widens it with the page width from sm up", () => {
    expect(globalsCss).toContain("@utility storefront-container {\n  @apply mx-auto px-4 sm:max-w-400 sm:px-6 lg:px-12;\n}")
  })
})

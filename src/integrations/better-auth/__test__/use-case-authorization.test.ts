import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vite-plus/test"

const USE_CASE_ROOT = "src/modules"

const PUBLIC_USE_CASES = new Set([
  "cart/use-cases/check-cart-availability.ts",
  "customer-activity/use-cases/record-customer-activity.ts",
  "delivery-method/use-cases/list-delivery-methods.ts",
  "product-category/use-cases/get-categories.ts",
  "product-category/use-cases/get-storefront-category.ts",
  "product-collection/use-cases/get-collections.ts",
  "product-collection/use-cases/get-storefront-collection.ts",
  "product/use-cases/get-new-arrivals.ts",
  "product/use-cases/get-product.ts",
  "product/use-cases/get-related-products.ts",
  "product/use-cases/get-storefront-products-page.ts",
  "storefront-search/use-cases/get-trending-searches.ts",
  "storefront-search/use-cases/search-storefront.ts",
])

const listUseCaseFiles = (dir: string, prefix = ""): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) {
      return entry.name === "__test__" ? [] : listUseCaseFiles(join(dir, entry.name), relative)
    }

    return relative.includes("/use-cases/") && relative.endsWith(".ts") ? [relative] : []
  })

const useCaseFiles = listUseCaseFiles(USE_CASE_ROOT)

describe("server function authorization", () => {
  it("finds use cases to check", () => {
    expect(useCaseFiles.length).toBeGreaterThan(0)
  })

  it.each(useCaseFiles)("%s declares its authorization", (file) => {
    const source = readFileSync(join(USE_CASE_ROOT, file), "utf8")
    if (!source.includes("createServerFn")) {
      return
    }

    if (PUBLIC_USE_CASES.has(file)) {
      expect(source).not.toContain("authorized(")

      return
    }

    expect(source).toContain("authorized(")
  })

  it.each(useCaseFiles)("%s does not assert authorization inside the handler", (file) => {
    expect(readFileSync(join(USE_CASE_ROOT, file), "utf8")).not.toContain("assertAdmin(")
  })

  it("keeps the public allowlist honest", () => {
    for (const file of PUBLIC_USE_CASES) {
      expect(useCaseFiles).toContain(file)
    }
  })
})

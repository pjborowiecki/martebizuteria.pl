import { describe, expect, it } from "vite-plus/test"

import { isAdminPathname } from "~/src/presentation/components/custom/pages/admin/lib/admin-route"

describe("isAdminPathname", () => {
  it.each([["/admin"], ["/admin/orders"], ["/en-US/admin/catalog/products"]])("treats %s as an admin route", (pathname) => {
    expect(isAdminPathname(pathname)).toBe(true)
  })

  it.each([["/"], ["/account"], ["/products/silver-ring"], ["/en-US/checkout"]])("treats %s as a storefront route", (pathname) => {
    expect(isAdminPathname(pathname)).toBe(false)
  })

  it.each([["/administration"], ["/products/admin-ring"]])("matches %s on the bare segment rather than a path boundary", (pathname) => {
    expect(isAdminPathname(pathname)).toBe(true)
  })
})

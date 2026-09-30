import { describe, expect, it } from "vite-plus/test"

import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY, adminShellCriticalStyle } from "~/src/presentation/theme/theme-init"

import { APP_NAME } from "~/src/presentation/branding/app"

import { ADMIN_SHELL_CHROME_BG } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"

describe("adminShellCriticalStyle", () => {
  it.each([["/admin"], ["/pl-PL/admin/orders"], ["/en-US/admin"]])("paints the admin chrome for %s", (pathname) => {
    expect(adminShellCriticalStyle(pathname)).toBe(
      `html[data-admin-shell],html[data-admin-shell] body{background-color:${ADMIN_SHELL_CHROME_BG}}`,
    )
  })

  it.each([["/"], ["/en-US/products"], ["/cart"]])("emits no critical style for the storefront path %s", (pathname) => {
    expect(adminShellCriticalStyle(pathname)).toBeUndefined()
  })

  it("matches any path containing the admin segment, because the check is a substring check", () => {
    expect(adminShellCriticalStyle("/en-US/admin-preview")).toBeDefined()
  })
})

describe("THEME_STORAGE_KEY", () => {
  it("namespaces the stored theme under the app name", () => {
    expect(THEME_STORAGE_KEY).toBe(`${APP_NAME}-theme`)
  })
})

describe("THEME_INIT_SCRIPT", () => {
  it("reads the theme from the storage key the app writes", () => {
    expect(THEME_INIT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY))
  })

  it("inlines the admin chrome colour so the shell never flashes", () => {
    expect(THEME_INIT_SCRIPT).toContain(JSON.stringify(ADMIN_SHELL_CHROME_BG))
  })

  it("forces light mode on admin paths and only then honours the dark preference", () => {
    expect(THEME_INIT_SCRIPT).toContain(`classList.remove("dark")`)
    expect(THEME_INIT_SCRIPT.indexOf(`classList.remove("dark")`)).toBeLessThan(THEME_INIT_SCRIPT.indexOf(`classList.add("dark")`))
  })

  it("swallows storage failures instead of breaking the document", () => {
    expect(THEME_INIT_SCRIPT).toContain("catch(e){}")
  })

  it("is a self-invoking statement, safe to inline in a script tag", () => {
    expect(THEME_INIT_SCRIPT.startsWith("(function(){")).toBe(true)
    expect(THEME_INIT_SCRIPT.endsWith("})();")).toBe(true)
  })

  it("contains no closing script tag that would end the inline script early", () => {
    expect(THEME_INIT_SCRIPT).not.toContain("</script")
  })
})

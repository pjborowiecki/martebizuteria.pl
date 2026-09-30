import type * as ReactRouter from "@tanstack/react-router"
import { isRedirect } from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

interface RouteDefinition {
  readonly beforeLoad?: () => void
  readonly component?: unknown
  readonly loader?: unknown
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return options
    },
  }
})

await import("~/src/routes/admin.catalog.categories.$handle")

const route = captured.current

if (route === undefined) {
  throw new Error("the category handle route did not register any options")
}

const beforeLoadThrow = (): unknown => {
  const caught: { thrown?: unknown } = {}

  try {
    route.beforeLoad?.()
  } catch (error: unknown) {
    caught.thrown = error
  }

  return caught.thrown
}

describe("admin category handle route", () => {
  it("guards the route before anything loads", () => {
    expect(route.beforeLoad).toBeTypeOf("function")
  })

  it("renders nothing and loads nothing of its own, so the URL can only redirect", () => {
    expect(route.component).toBeUndefined()
    expect(route.loader).toBeUndefined()
  })

  it("sends a deep link for a single category back to the categories list", () => {
    const thrown = beforeLoadThrow()

    expect(isRedirect(thrown)).toBe(true)
    expect(isRedirect(thrown) ? thrown.options.to : undefined).toBe("/admin/catalog/categories")
  })
})

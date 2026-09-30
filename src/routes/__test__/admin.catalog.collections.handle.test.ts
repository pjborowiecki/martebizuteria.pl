import type * as ReactRouter from "@tanstack/react-router"
import { isRedirect } from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

interface RouteDefinition {
  readonly beforeLoad?: () => void
  readonly component?: unknown
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

await import("~/src/routes/admin.catalog.collections.$handle")

const route = captured.current

if (route === undefined) {
  throw new Error("the collection handle route did not register any options")
}

describe("admin collection handle route", () => {
  it("guards the route before anything loads", () => {
    expect(route.beforeLoad).toBeTypeOf("function")
  })

  it("renders nothing of its own, so the URL can only redirect", () => {
    expect(route.component).toBeUndefined()
  })

  it("sends a deep link for a single collection back to the collections list", () => {
    const caught: { thrown?: unknown } = {}

    try {
      route.beforeLoad?.()
    } catch (error: unknown) {
      caught.thrown = error
    }

    const { thrown } = caught

    expect(isRedirect(thrown)).toBe(true)
    expect(isRedirect(thrown) ? thrown.options.to : undefined).toBe("/admin/catalog/collections")
  })
})

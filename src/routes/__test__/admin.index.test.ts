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

await import("~/src/routes/admin.index")

const route = captured.current

if (route === undefined) {
  throw new Error("the admin index route did not register any options")
}

const beforeLoad = (): unknown => {
  const caught: { thrown?: unknown } = {}

  try {
    route.beforeLoad?.()
  } catch (error: unknown) {
    caught.thrown = error
  }

  return caught.thrown
}

describe("admin index route", () => {
  it("sends the bare admin url on to the overview page", () => {
    const thrown = beforeLoad()

    expect(isRedirect(thrown)).toBe(true)
    expect(isRedirect(thrown) ? thrown.options.to : undefined).toBe("/admin/overview")
  })

  it("renders nothing of its own, so the url can only redirect", () => {
    expect(route.component).toBeUndefined()
    expect(route.loader).toBeUndefined()
  })
})

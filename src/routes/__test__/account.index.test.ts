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

await import("~/src/routes/account.index")

const route = captured.current

if (route === undefined) {
  throw new Error("the account index route did not register any options")
}

describe("account index route", () => {
  it("renders nothing of its own, so the URL can only redirect", () => {
    expect(route.component).toBeUndefined()
    expect(route.loader).toBeUndefined()
  })

  it("sends the bare account URL on to the overview page before anything loads", () => {
    const caught: { thrown?: unknown } = {}

    try {
      route.beforeLoad?.()
    } catch (error: unknown) {
      caught.thrown = error
    }

    const { thrown } = caught

    expect(isRedirect(thrown)).toBe(true)
    expect(isRedirect(thrown) ? thrown.options.to : undefined).toBe("/account/overview")
  })
})

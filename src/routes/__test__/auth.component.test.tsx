import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

const guarded = vi.hoisted(() => ({
  beforeLoad: undefined as unknown,
  redirectIfSignedIn: vi.fn<() => Promise<void>>(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: { beforeLoad: unknown }) => {
      guarded.beforeLoad = options.beforeLoad

      return { options }
    },
    Outlet: (): JSX.Element => <form data-testid="outlet" />,
  }
})
vi.mock("~/src/integrations/better-auth/auth.routes", () => ({ redirectIfSignedIn: guarded.redirectIfSignedIn }))
vi.mock("~/src/presentation/components/custom/pages/auth/auth-editorial", () => ({
  AuthEditorial: (): JSX.Element => <aside data-testid="auth-editorial" />,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation", () => ({
  Navigation: (): JSX.Element => <nav data-testid="navigation" />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/auth"

const renderAuthLayout = () => {
  const AuthLayoutRoute = Route.options.component
  if (AuthLayoutRoute === undefined) {
    throw new Error("the auth layout route registered no component")
  }

  return renderWithProviders(<AuthLayoutRoute />)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("auth layout route", () => {
  it("keeps the storefront navigation above the auth split", () => {
    renderAuthLayout()

    expect(screen.getByTestId("navigation")).toBeInTheDocument()
  })

  it("shows the editorial panel beside the form", () => {
    renderAuthLayout()

    expect(screen.getByTestId("auth-editorial")).toBeInTheDocument()
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
  })

  it("puts the editorial panel before the form in the document", () => {
    renderAuthLayout()

    const editorial = screen.getByTestId("auth-editorial")
    const outlet = screen.getByTestId("outlet")

    expect(editorial.compareDocumentPosition(outlet) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("sends a visitor who is already signed in on before the auth pages load", () => {
    expect(guarded.beforeLoad).toBe(guarded.redirectIfSignedIn)
  })

  it("declares the auth message namespaces the nested pages need", () => {
    expect(Route.options.staticData?.namespaces).toStrictEqual(["pages.auth.errors", "pages.auth.validations", "pages.auth.oauth"])
  })
})

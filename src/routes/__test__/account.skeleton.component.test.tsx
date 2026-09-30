import { type JSX, lazy } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

const NeverLoads = lazy(() => new Promise<{ default: () => null }>(() => {}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return { ...actual, Outlet: (): JSX.Element => <NeverLoads /> }
})
vi.mock("~/src/integrations/better-auth/auth.routes", () => ({ requireCustomer: vi.fn() }))
vi.mock("~/src/presentation/components/custom/pages/account/account-sidebar", () => ({
  AccountSidebar: (): JSX.Element => <NeverLoads />,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation", () => ({
  Navigation: (): JSX.Element => <header data-testid="storefront-navigation" />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/account"

const renderLayout = () => {
  const AccountLayout = Route.options.component
  if (AccountLayout === undefined) {
    throw new Error("the account route registered no component")
  }

  return renderWithProviders(<AccountLayout />)
}

afterEach(cleanup)

describe("account layout while its panels are still loading", () => {
  it("keeps the storefront navigation on screen instead of blanking the page", () => {
    renderLayout()

    expect(screen.getByTestId("storefront-navigation")).toBeInTheDocument()
    expect(screen.getByRole("main")).toBeInTheDocument()
  })

  it("stands a placeholder in for both the sidebar and the routed page", () => {
    const { container } = renderLayout()

    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2)
  })

  it("sketches one placeholder row per account section in the sidebar", () => {
    const { container } = renderLayout()

    expect(container.querySelectorAll("aside > div:last-of-type > div")).toHaveLength(7)
  })

  it("hides the placeholders from assistive technology", () => {
    const { container } = renderLayout()

    expect(container.querySelector("aside")).toHaveAttribute("aria-hidden", "true")
  })
})

import { type JSX } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRoute, createRouter } from "@tanstack/react-router"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { type SessionUser, redirectIfSignedIn } from "~/src/integrations/better-auth/auth.routes"

import { usePostAuthRedirect } from "~/src/hooks/use-post-auth-redirect"

interface SessionLookup {
  readonly session: { readonly id: string; readonly token: string; readonly userId: string }
  readonly user: Pick<SessionUser, "id" | "role">
}

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn<() => Promise<SessionLookup | null>>() }))

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ handler: (handler: unknown) => handler }),
  createServerOnlyFn: (fn: unknown) => fn,
}))
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => new Request("https://store.test/") }))
vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth: { api: { getSession } } }))

const SignInPage = (): JSX.Element => {
  const redirectAfterAuth = usePostAuthRedirect()

  return (
    <button
      onClick={() => {
        void redirectAfterAuth()
      }}
      type="button"
    >
      finish signing in
    </button>
  )
}

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({ component: Outlet })

const authRoute = createRoute({ beforeLoad: redirectIfSignedIn, component: Outlet, getParentRoute: () => rootRoute, path: "auth" })

const signInRoute = createRoute({ component: SignInPage, getParentRoute: () => authRoute, path: "sign-in" })

const pageAt = (path: string, heading: string) =>
  createRoute({ component: () => <h1>{heading}</h1>, getParentRoute: () => rootRoute, path })

const routeTree = rootRoute.addChildren([
  authRoute.addChildren([signInRoute]),
  pageAt("account/overview", "Your account"),
  pageAt("account/orders/order-7", "Order 7"),
  pageAt("admin", "Dashboard"),
])

const signedInAs = (role: string): void => {
  getSession.mockResolvedValue({ session: { id: "session-1", token: "secret", userId: "user-1" }, user: { id: "user-1", role } })
}

const finishSigningInFrom = async (path: string, role: string): Promise<void> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({ context: { queryClient }, history: createMemoryHistory({ initialEntries: [path] }), routeTree })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  const finish = await screen.findByRole("button", { name: "finish signing in" })

  signedInAs(role)
  fireEvent.click(finish)
}

beforeEach(() => {
  vi.resetAllMocks()
  getSession.mockResolvedValue(null)
})

afterEach(cleanup)

describe("usePostAuthRedirect", () => {
  it("returns a customer to the page they asked for before signing in", async () => {
    await finishSigningInFrom("/auth/sign-in?redirect=%2Faccount%2Forders%2Forder-7", ROLES.CUSTOMER)

    expect(await screen.findByRole("heading", { name: "Order 7" })).toBeInTheDocument()
  })

  it("sends a customer with no destination to their account overview", async () => {
    await finishSigningInFrom("/auth/sign-in", ROLES.CUSTOMER)

    expect(await screen.findByRole("heading", { name: "Your account" })).toBeInTheDocument()
  })

  it("sends an administrator to the dashboard", async () => {
    await finishSigningInFrom("/auth/sign-in", ROLES.ADMIN)

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
  })

  it("ignores a destination on another site", async () => {
    await finishSigningInFrom("/auth/sign-in?redirect=https%3A%2F%2Fevil.test%2Fsteal", ROLES.CUSTOMER)

    expect(await screen.findByRole("heading", { name: "Your account" })).toBeInTheDocument()
  })

  it("asks for the session afresh instead of trusting the signed-out answer cached when the page opened", async () => {
    await finishSigningInFrom("/auth/sign-in", ROLES.CUSTOMER)

    await screen.findByRole("heading", { name: "Your account" })
    expect(getSession).toHaveBeenCalledTimes(2)
  })
})

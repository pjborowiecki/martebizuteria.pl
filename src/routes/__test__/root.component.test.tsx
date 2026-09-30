import { type JSX, type ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRoute, createRouter } from "@tanstack/react-router"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

const intl = vi.hoisted(() => ({ locale: "en-US" as "en-US" | "pl-PL", pathname: "/" }))

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))
vi.mock(import("~/src/integrations/use-intl/i18n.messages"), async (importOriginal) => ({
  ...(await importOriginal()),
  getRouteNamespaces: () => [],
  preloadNamespaces: () => Promise.resolve(),
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({
  getCurrentLocale: () => intl.locale,
  getCurrentPathname: () => intl.pathname,
}))
vi.mock("~/src/presentation/components/custom/smooth-scroll", () => ({
  SmoothScroll: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <div data-testid="smooth-scroll">{children}</div>,
}))
vi.mock("~/src/presentation/components/custom/pages/auth/verification-toast", () => ({
  VerificationToast: (): JSX.Element => <span data-testid="verification-toast" />,
}))
vi.mock("~/src/presentation/components/shadcn/sonner", () => ({
  Toaster: ({ variant }: Readonly<{ variant: string }>): JSX.Element => <span data-testid="toaster" data-variant={variant} />,
}))

import { Route as RootRoute } from "~/src/routes/__root"

import { ImagePrefetchService } from "~/src/lib/image"

const renderRootAt = async (pathname: string) => {
  intl.pathname = pathname
  const catchAll = createRoute({
    component: () => <p>page body</p>,
    getParentRoute: () => RootRoute,
    path: "$",
  })
  const index = createRoute({ component: () => <p>page body</p>, getParentRoute: () => RootRoute, path: "/" })
  const router = createRouter({
    context: { imagePrefetchService: new ImagePrefetchService(), queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [pathname] }),
    routeTree: RootRoute.addChildren([index, catchAll]),
  })
  await router.load()

  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(cleanup)

describe("root layout component", () => {
  it("wraps the storefront in smooth scrolling", async () => {
    await renderRootAt("/products")

    expect(await screen.findByTestId("smooth-scroll")).toBeInTheDocument()
    expect(screen.getByText("page body")).toBeInTheDocument()
  })

  it("renders the admin panel without smooth scrolling", async () => {
    await renderRootAt("/admin/overview")

    expect(await screen.findByText("page body")).toBeInTheDocument()
    expect(screen.queryByTestId("smooth-scroll")).toBeNull()
    expect(document.querySelector("html[data-admin-shell]")).not.toBeNull()
  })

  it("themes the toaster for the admin shell", async () => {
    await renderRootAt("/admin/overview")

    expect(await screen.findByTestId("toaster")).toHaveAttribute("data-variant", "admin")
  })

  it("themes the toaster for the storefront", async () => {
    await renderRootAt("/products")

    expect(await screen.findByTestId("toaster")).toHaveAttribute("data-variant", "default")
  })

  it("always mounts the email verification toast", async () => {
    await renderRootAt("/products")

    expect(await screen.findByTestId("verification-toast")).toBeInTheDocument()
  })
})

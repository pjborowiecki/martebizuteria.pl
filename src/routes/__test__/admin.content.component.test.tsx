import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { isNotFound } from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

interface RouteContext {
  readonly context: { readonly queryClient: QueryClient }
  readonly params: { readonly handle: string }
}

interface ContentRouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (ctx: RouteContext) => Promise<unknown>
}

const captured = vi.hoisted(() => ({ routes: new Map<string, ContentRouteDefinition>() }))

const remote = vi.hoisted(() => ({ page: vi.fn<(handle: string) => Promise<unknown>>(), pages: vi.fn<() => Promise<unknown>>() }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: (path: string) => (options: ContentRouteDefinition) => {
      captured.routes.set(path, options)

      return { ...options, useLoaderData: () => "privacy-policy" }
    },
  }
})
vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({
  AdminHeader: ({
    breadcrumbs,
    description,
    title,
  }: Readonly<{ breadcrumbs?: readonly { href?: string; label: string }[]; description?: string; title: ReactNode }>): JSX.Element => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      <nav aria-label="breadcrumbs">{(breadcrumbs ?? []).map((crumb) => `${crumb.label}:${crumb.href ?? ""}`).join("|")}</nav>
    </header>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/content/content-page-list", () => ({
  ContentPageList: (): JSX.Element => <section data-testid="content-page-list" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/content/content-page-editor", () => ({
  ContentPageEditor: ({ handle }: Readonly<{ handle: string }>): JSX.Element => (
    <section data-testid="content-page-editor">{handle}</section>
  ),
}))
vi.mock("~/src/modules/content-page/use-cases/get-admin-content-pages", () => ({
  getAdminContentPagesQuery: () => ({ queryFn: () => remote.pages(), queryKey: ["admin", "content-pages"] }),
}))
vi.mock("~/src/modules/content-page/use-cases/get-admin-content-page", () => ({
  getAdminContentPageQuery: (handle: string) => ({ queryFn: () => remote.page(handle), queryKey: ["admin", "content-page", handle] }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

await import("~/src/routes/admin.content.index")
await import("~/src/routes/admin.content.$handle")

const routeAt = (path: string): Required<ContentRouteDefinition> => {
  const route = captured.routes.get(path)
  if (route?.component === undefined || route.loader === undefined) {
    throw new Error(`the ${path} route registered no component and loader`)
  }

  return { component: route.component, loader: route.loader }
}

const indexRoute = routeAt("/admin/content/")

const editorRoute = routeAt("/admin/content/$handle")

const loadEditor = (handle: string) => editorRoute.loader({ context: { queryClient: new QueryClient() }, params: { handle } })

afterEach(cleanup)

describe("the admin content index", () => {
  it("heads the page list under the dashboard", () => {
    const ContentRoute = indexRoute.component
    renderWithProviders(<ContentRoute />)

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Content")
    expect(screen.getByText("Edit the information pages of your store.")).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "breadcrumbs" })).toHaveTextContent("Dashboard:/admin")
    expect(screen.getByTestId("content-page-list")).toBeInTheDocument()
  })

  it("loads the page list before rendering", async () => {
    remote.pages.mockResolvedValue([])

    await indexRoute.loader({ context: { queryClient: new QueryClient() }, params: { handle: "" } })

    expect(remote.pages).toHaveBeenCalledOnce()
  })
})

describe("the admin content editor route", () => {
  it("loads the page it edits and hands its handle to the editor", async () => {
    remote.page.mockResolvedValue({ handle: "privacy-policy" })

    await expect(loadEditor("privacy-policy")).resolves.toBe("privacy-policy")
    expect(remote.page).toHaveBeenCalledWith("privacy-policy")

    const EditorRoute = editorRoute.component
    renderWithProviders(<EditorRoute />)
    expect(screen.getByTestId("content-page-editor")).toHaveTextContent("privacy-policy")
  })

  it("answers not found for a page the store does not have", async () => {
    await expect(loadEditor("terms")).rejects.toSatisfy(isNotFound)
    expect(remote.page).not.toHaveBeenCalledWith("terms")
  })
})

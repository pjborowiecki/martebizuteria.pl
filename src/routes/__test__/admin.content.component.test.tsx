import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({
  AdminHeader: ({
    actions,
    breadcrumbs,
    description,
    title,
  }: Readonly<{
    actions?: ReactNode
    breadcrumbs?: readonly { href?: string; label: string }[]
    description?: string
    title: ReactNode
  }>): JSX.Element => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      <nav aria-label="breadcrumbs">{(breadcrumbs ?? []).map((crumb) => `${crumb.label}:${crumb.href ?? ""}`).join("|")}</nav>
      <div data-testid="actions">{actions}</div>
    </header>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/content/content-type-cards", () => ({
  ContentTypeCards: (): JSX.Element => <section data-testid="content-type-cards" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/content/content-list-table", () => ({
  ContentListTable: (): JSX.Element => <section data-testid="content-list-table" />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/admin.content"

const renderContentPage = () => {
  const ContentPage = Route.options.component
  if (ContentPage === undefined) {
    throw new Error("the admin content route registered no component")
  }

  return renderWithProviders(<ContentPage />)
}

afterEach(() => {
  cleanup()
})

describe("admin content page", () => {
  it("heads the page with the translated title and description", () => {
    renderContentPage()

    expect(screen.getByRole("heading", { name: "Content Management" })).toBeInTheDocument()
    expect(screen.getByText("Manage your store's pages, articles, and promotional banners.")).toBeInTheDocument()
  })

  it("links the breadcrumb trail back to the dashboard", () => {
    renderContentPage()

    expect(screen.getByLabelText("breadcrumbs")).toHaveTextContent("Dashboard:/admin")
  })

  it("offers a new page action", () => {
    renderContentPage()

    expect(screen.getByRole("button", { name: /New Page/u })).toBeInTheDocument()
  })

  it("puts both header actions in the header, not the body", () => {
    renderContentPage()

    expect(screen.getByTestId("actions").querySelectorAll("button")).toHaveLength(2)
  })

  it("shows the content type cards above the list", () => {
    renderContentPage()

    expect(screen.getByTestId("content-type-cards")).toBeInTheDocument()
    expect(screen.getByTestId("content-list-table")).toBeInTheDocument()
  })

  it("places the cards before the table in the document", () => {
    renderContentPage()

    const cards = screen.getByTestId("content-type-cards")
    const table = screen.getByTestId("content-list-table")

    expect(cards.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

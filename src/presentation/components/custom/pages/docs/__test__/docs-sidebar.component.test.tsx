import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type DocsNavigationSection } from "~/src/integrations/fumadocs/fumadocs.docs"

import { DocsSidebar } from "~/src/presentation/components/custom/pages/docs/docs-sidebar"

const SECTIONS: readonly DocsNavigationSection[] = [
  {
    links: [
      { splat: "architecture", title: "Architecture" },
      { splat: "architecture/routing", title: "Routing" },
    ],
    title: "Architecture",
  },
  {
    links: [{ splat: "tooling/testing", title: "Testing" }],
    title: "Tooling",
  },
]

const EMPTY_SECTIONS: readonly DocsNavigationSection[] = []

afterEach(cleanup)

describe("DocsSidebar", () => {
  it("labels the navigation from the documentation messages", () => {
    renderWithProviders(<DocsSidebar sections={SECTIONS} />)

    expect(screen.getByRole("navigation", { name: "Documentation sections" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Documentation" })).toBeInTheDocument()
  })

  it("links to the documentation root above the sections", () => {
    renderWithProviders(<DocsSidebar sections={SECTIONS} />)

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/docs")
  })

  it("builds one splat link per page, keeping the order it was given", () => {
    renderWithProviders(<DocsSidebar sections={SECTIONS} />)

    expect(screen.getByRole("link", { name: "Routing" })).toHaveAttribute("href", "/docs/architecture/routing")
    expect(screen.getByRole("link", { name: "Testing" })).toHaveAttribute("href", "/docs/tooling/testing")
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toStrictEqual(["Overview", "Architecture", "Routing", "Testing"])
  })

  it("still renders the root link when no section has been written yet", () => {
    renderWithProviders(<DocsSidebar sections={EMPTY_SECTIONS} />)

    expect(screen.getAllByRole("link")).toHaveLength(1)
  })
})

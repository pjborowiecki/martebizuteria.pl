import { type ReactNode } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

const viewport = vi.hoisted(() => ({ isMobile: false }))

vi.mock("~/src/hooks/use-mobile", () => ({ useIsMobile: () => viewport.isMobile }))

import { Sidebar, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger } from "~/src/presentation/components/shadcn/sidebar"

import polishShadcnMessages from "~/messages/pl-PL/components.shadcn.json"

const renderInPolish = (children: ReactNode) =>
  render(
    <IntlProvider locale="pl-PL" messages={{ components: { shadcn: polishShadcnMessages } }}>
      <SidebarProvider>{children}</SidebarProvider>
    </IntlProvider>,
  )

afterEach(() => {
  cleanup()
  viewport.isMobile = false
})

describe("SidebarSeparator", () => {
  it("stays inside the sidebar's side margins instead of running past its edge", () => {
    const { container } = renderInPolish(<SidebarSeparator />)
    const separator = container.querySelector("[data-slot='sidebar-separator']")

    expect(separator).toHaveClass("mx-2", "data-horizontal:w-auto")
    expect(separator).not.toHaveClass("data-horizontal:w-full")
  })
})

describe("Sidebar labels", () => {
  it("names the sidebar button in the shop's language", () => {
    renderInPolish(<SidebarTrigger />)

    expect(screen.getByRole("button", { name: "Przełącz menu boczne" })).toBeInTheDocument()
  })

  it("names the rail that toggles the sidebar in the shop's language", () => {
    renderInPolish(<SidebarRail />)

    expect(screen.getByRole("button", { name: "Przełącz menu boczne" })).toHaveAttribute("title", "Przełącz menu boczne")
  })

  it("announces the phone drawer in the shop's language", async () => {
    viewport.isMobile = true
    renderInPolish(
      <>
        <SidebarTrigger />
        <Sidebar>
          <nav>Zamówienia</nav>
        </Sidebar>
      </>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Przełącz menu boczne" }))

    expect(await screen.findByRole("dialog", { name: "Menu boczne" })).toHaveAccessibleDescription("Wyświetla menu boczne na telefonie.")
  })
})

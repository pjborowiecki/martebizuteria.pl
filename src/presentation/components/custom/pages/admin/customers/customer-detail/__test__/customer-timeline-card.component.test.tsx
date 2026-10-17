import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type User } from "~/src/modules/user/user.types"

import { CustomerTimelineCard } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-timeline-card"

const pageViews = (count: number): User["adminCustomerDetail"]["timeline"] =>
  Array.from({ length: count }, (_, index) => ({ date: `${index + 1} Jan 2026`, kind: "page_viewed", path: `/products/${index}` }))

afterEach(() => {
  cleanup()
})

describe("CustomerTimelineCard", () => {
  it("lists every event in order inside a region that scrolls instead of growing the page", () => {
    renderWithProviders(<CustomerTimelineCard timeline={pageViews(60)} />)
    const list = screen.getByRole("list")

    expect(screen.getAllByRole("listitem")).toHaveLength(60)
    expect(list.tagName).toBe("OL")
    expect(list).toHaveClass("min-h-0", "overflow-y-auto")
  })

  it("caps the list at part of the screen when the page scrolls as a whole and lets the card size it on a wide, tall screen", () => {
    renderWithProviders(<CustomerTimelineCard timeline={pageViews(60)} />)

    expect(screen.getByRole("list")).toHaveClass("max-h-[min(60vh,30rem)]", "2xl:[@media(min-height:57rem)]:max-h-none")
  })

  it("keeps the heading in place above the scrolling events", () => {
    renderWithProviders(<CustomerTimelineCard timeline={pageViews(3)} />)

    expect(screen.getByText("Activity Timeline")).toHaveClass("shrink-0")
    expect(screen.getByRole("list").parentElement).toHaveClass("flex", "min-h-0", "flex-col")
  })

  it("takes the height the sidebar has left on a wide, tall screen without shrinking to nothing", () => {
    const { container } = renderWithProviders(<CustomerTimelineCard timeline={pageViews(3)} />)

    expect(container.firstElementChild).toHaveClass(
      "flex",
      "flex-col",
      "2xl:[@media(min-height:57rem)]:min-h-44",
      "2xl:[@media(min-height:57rem)]:flex-1",
    )
    expect(container.firstElementChild).not.toHaveClass("flex-1")
  })

  it("joins consecutive events with a line that stops at the last one", () => {
    renderWithProviders(<CustomerTimelineCard timeline={pageViews(3)} />)
    const connectors = screen.getAllByRole("listitem").map((item) => item.querySelector(".absolute") !== null)

    expect(connectors).toStrictEqual([true, true, false])
  })

  it("describes a change of sign-in address with the old and new address when the entry names them", () => {
    renderWithProviders(
      <CustomerTimelineCard
        timeline={[
          { date: "3 Feb 2026", from: "anna@old.example", kind: "email_changed", to: "anna@new.example" },
          { date: "2 Feb 2026", kind: "email_changed" },
        ]}
      />,
    )

    expect(screen.getByText("Changed the sign-in email from anna@old.example to anna@new.example")).toBeInTheDocument()
    expect(screen.getByText("Changed the sign-in email")).toBeInTheDocument()
  })

  it("says so when there is no activity", () => {
    renderWithProviders(<CustomerTimelineCard timeline={[]} />)

    expect(screen.getByText("No activity yet.")).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })
})

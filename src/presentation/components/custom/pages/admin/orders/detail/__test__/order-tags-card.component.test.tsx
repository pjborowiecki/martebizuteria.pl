import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DEMO_ORDER } from "~/src/data/order-detail"

import { OrderTagsCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-tags-card"

afterEach(() => {
  cleanup()
})

describe("OrderTagsCard", () => {
  it("titles the card with the tags heading", () => {
    renderWithProviders(<OrderTagsCard />)

    expect(screen.getByText("Tags")).toBeInTheDocument()
  })

  it("renders one badge per tag on the order", () => {
    renderWithProviders(<OrderTagsCard />)

    for (const tag of DEMO_ORDER.tags) {
      expect(screen.getByText(tag)).toBeInTheDocument()
    }
  })

  it("keeps the tags in the order the demo order lists them", () => {
    const { container } = renderWithProviders(<OrderTagsCard />)
    const badges = [...(container.querySelector("div.flex-wrap")?.children ?? [])].map((node) => node.textContent)

    expect(badges).toStrictEqual([...DEMO_ORDER.tags])
  })
})

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { ADMIN_STAT_CAPTION_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { AdminStatCaption } from "~/src/presentation/components/custom/pages/admin/admin-stat-caption"

afterEach(() => {
  cleanup()
})

describe("AdminStatCaption", () => {
  it("renders the caption once the values have arrived", () => {
    render(<AdminStatCaption caption="12 low on stock" valuesPending={false} />)

    expect(screen.getByText("12 low on stock")).toHaveClass(ADMIN_STAT_CAPTION_CLASS)
  })

  it("renders a placeholder instead of the caption while the values are pending", () => {
    const { container } = render(<AdminStatCaption caption="12 low on stock" valuesPending />)

    expect(screen.queryByText("12 low on stock")).not.toBeInTheDocument()
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
  })

  it("keeps the placeholder even when no caption was supplied", () => {
    const { container } = render(<AdminStatCaption valuesPending />)

    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
  })

  it("renders nothing at all when there is no caption and nothing is pending", () => {
    const { container } = render(<AdminStatCaption valuesPending={false} />)

    expect(container).toBeEmptyDOMElement()
  })
})

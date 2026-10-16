import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_STAT_VALUE_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { AdminStatValue } from "~/src/presentation/components/custom/pages/admin/admin-stat-value"

const VALUE_COLUMN_WIDTH_PX = 134

const LARGE_TOTAL = "99 999,99 zł"

const LARGE_TOTAL_WIDTH_PX = 170

const SMALL_COUNT = "42"

const SMALL_COUNT_WIDTH_PX = 36

const renderFigure = (value: string, widthPx: number): HTMLElement => {
  renderWithProviders(
    <TooltipPrimitive.Provider delay={0}>
      <AdminStatValue value={value} />
    </TooltipPrimitive.Provider>,
  )
  const figure = screen.getByText(value)
  Object.defineProperty(figure, "scrollWidth", { configurable: true, value: widthPx })
  Object.defineProperty(figure, "clientWidth", { configurable: true, value: VALUE_COLUMN_WIDTH_PX })

  return figure
}

const fullFigureTooltip = (value: string): HTMLElement | null => screen.queryByText(value, { selector: "[data-slot='tooltip-content']" })

afterEach(cleanup)

describe("AdminStatValue", () => {
  it("ends a figure wider than the card's value column in an ellipsis instead of running under the icon", () => {
    const figure = renderFigure(LARGE_TOTAL, LARGE_TOTAL_WIDTH_PX)

    expect(figure).toHaveClass(ADMIN_STAT_VALUE_CLASS)
    expect(figure).toHaveClass("min-w-0", "truncate")
  })

  it("shows a cut figure in full on hover", async () => {
    await userEvent.hover(renderFigure(LARGE_TOTAL, LARGE_TOTAL_WIDTH_PX))

    expect(fullFigureTooltip(LARGE_TOTAL)).toBeInTheDocument()
  })

  it("takes a card's own spacing and size on top of the shared figure style", () => {
    renderWithProviders(<AdminStatValue className="mt-3 text-2xl" value={LARGE_TOTAL} />)
    const figure = screen.getByText(LARGE_TOTAL)

    expect(figure).toHaveClass("mt-3", "text-2xl", "min-w-0", "truncate", "font-semibold")
    expect(figure).not.toHaveClass("text-3xl")
  })

  it("adds no tooltip repeating a figure that fits", async () => {
    await userEvent.hover(renderFigure(SMALL_COUNT, SMALL_COUNT_WIDTH_PX))

    expect(fullFigureTooltip(SMALL_COUNT)).not.toBeInTheDocument()
  })
})

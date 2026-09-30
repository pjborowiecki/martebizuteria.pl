import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"

import {
  CATALOG_DATAGRID_EMPTY_TEXT_CLASS,
  CATALOG_DATAGRID_MUTED_TEXT_CLASS,
  CatalogTruncatedTextCell,
} from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"

describe("CatalogTruncatedTextCell", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows the placeholder instead of a tooltip for an empty cell", () => {
    renderWithProviders(<CatalogTruncatedTextCell text="" />)
    const placeholder = screen.getByText(EMPTY_VALUE)

    expect(placeholder.className).toBe(CATALOG_DATAGRID_EMPTY_TEXT_CLASS)
    expect(placeholder).not.toHaveAttribute("data-slot", "tooltip-trigger")
  })

  it("renders filled text as a tooltip trigger", () => {
    renderWithProviders(<CatalogTruncatedTextCell text="Handmade silver ring" />)

    expect(screen.getByText("Handmade silver ring")).toHaveAttribute("data-slot", "tooltip-trigger")
  })

  it("keeps the full text out of the document until the cell is hovered", () => {
    renderWithProviders(<CatalogTruncatedTextCell text="Handmade silver ring" />)

    expect(screen.getAllByText("Handmade silver ring")).toHaveLength(1)
  })

  it("reveals the full text in a popup once the cell is hovered", async () => {
    renderWithProviders(<CatalogTruncatedTextCell text="Handmade silver ring" />)

    await userEvent.hover(screen.getByText("Handmade silver ring"))

    const popup = await screen.findByText("Handmade silver ring", { selector: "[data-slot='tooltip-content']" })

    expect(popup).toHaveTextContent("Handmade silver ring")
  })

  it("mutes the text by default", () => {
    renderWithProviders(<CatalogTruncatedTextCell text="Handmade silver ring" />)

    expect(screen.getByText("Handmade silver ring").className).toContain(CATALOG_DATAGRID_MUTED_TEXT_CLASS)
  })

  it("drops the muted treatment when asked, keeping the truncation", () => {
    renderWithProviders(<CatalogTruncatedTextCell muted={false} text="Handmade silver ring" />)
    const trigger = screen.getByText("Handmade silver ring")

    expect(trigger.className).not.toContain("text-muted-foreground")
    expect(trigger.className).toContain("truncate")
  })

  it("appends a caller class alongside its own", () => {
    renderWithProviders(<CatalogTruncatedTextCell className="max-w-40" text="Handmade silver ring" />)

    expect(screen.getByText("Handmade silver ring").className).toContain("max-w-40")
  })
})

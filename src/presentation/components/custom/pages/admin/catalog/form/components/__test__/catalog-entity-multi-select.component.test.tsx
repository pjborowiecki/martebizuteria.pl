import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CatalogEntityMultiSelect } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-entity-multi-select"

const onChange = vi.fn<(ids: readonly string[]) => void>()

const OPTIONS = [
  { id: "collection-1", label: "New arrivals" },
  { id: "collection-2", label: "Sale" },
  { id: "collection-3", label: "Bestsellers" },
]

const LABEL = "Collections"

const renderSelect = (
  props: Partial<{
    readonly disabled: boolean
    readonly options: readonly { readonly id: string; readonly label: string }[]
    readonly selectedIds: readonly string[]
    readonly showSelectedBadges: boolean
  }> = {},
) =>
  renderWithProviders(
    <CatalogEntityMultiSelect
      ariaLabel={LABEL}
      disabled={props.disabled ?? false}
      onChange={onChange}
      options={props.options ?? OPTIONS}
      placeholder="Select collections"
      selectedIds={props.selectedIds ?? []}
      showSelectedBadges={props.showSelectedBadges ?? true}
    />,
  )

beforeEach(() => {
  onChange.mockReset()
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn(), writable: true })
})

afterEach(cleanup)

describe("CatalogEntityMultiSelect trigger", () => {
  it("shows a placeholder while nothing is selected", () => {
    renderSelect()

    expect(screen.getByRole("button", { name: LABEL })).toHaveTextContent("Select collections")
  })

  it("lists up to two selected labels inline", () => {
    renderSelect({ selectedIds: ["collection-1", "collection-2"] })

    expect(screen.getByRole("button", { name: LABEL })).toHaveTextContent("New arrivals, Sale")
  })

  it("counts the selection once it grows past two", () => {
    renderSelect({ selectedIds: ["collection-1", "collection-2", "collection-3"] })

    expect(screen.getByRole("button", { name: LABEL })).toHaveTextContent("3 selected")
  })

  it("ignores a selected id that is not among the options", () => {
    renderSelect({ selectedIds: ["collection-1", "ghost"] })

    expect(screen.getByRole("button", { name: LABEL })).toHaveTextContent("New arrivals")
    expect(screen.getAllByText("New arrivals")).toHaveLength(2)
  })

  it("renders a placeholder instead of a control when there is nothing to pick", () => {
    renderSelect({ options: [] })

    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("blocks the trigger while the form is busy", () => {
    renderSelect({ disabled: true })

    expect(screen.getByRole("button", { name: LABEL })).toBeDisabled()
  })
})

describe("CatalogEntityMultiSelect picking", () => {
  it("keeps the list closed until the trigger is used", () => {
    renderSelect()

    expect(screen.queryByPlaceholderText("Search...")).toBeNull()
  })

  it("adds the chosen option to the selection", async () => {
    renderSelect({ selectedIds: ["collection-1"] })

    await userEvent.click(screen.getByRole("button", { name: LABEL }))
    await userEvent.click(await screen.findByRole("option", { name: "Sale" }))

    expect(onChange).toHaveBeenCalledWith(["collection-1", "collection-2"])
  })

  it("removes an option that was already selected", async () => {
    renderSelect({ selectedIds: ["collection-1", "collection-2"] })

    await userEvent.click(screen.getByRole("button", { name: LABEL }))
    await userEvent.click(await screen.findByRole("option", { name: "New arrivals" }))

    expect(onChange).toHaveBeenCalledWith(["collection-2"])
  })

  it("marks the selected options in the list", async () => {
    renderSelect({ selectedIds: ["collection-2"] })

    await userEvent.click(screen.getByRole("button", { name: LABEL }))

    expect(await screen.findByRole("option", { name: "Sale" })).toHaveAttribute("data-checked", "true")
    expect(screen.getByRole("option", { name: "Bestsellers" })).not.toHaveAttribute("data-checked")
  })

  it("reports when the search matches nothing", async () => {
    renderSelect()

    await userEvent.click(screen.getByRole("button", { name: LABEL }))
    await userEvent.type(await screen.findByPlaceholderText("Search..."), "platinum")

    expect(await screen.findByText("No results found.")).toBeInTheDocument()
  })
})

describe("CatalogEntityMultiSelect badges", () => {
  it("shows one removable badge per selected option", () => {
    renderSelect({ selectedIds: ["collection-1", "collection-2"] })

    expect(screen.getByRole("button", { name: "Remove New arrivals" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remove Sale" })).toBeInTheDocument()
  })

  it("drops only the removed option from the selection", async () => {
    renderSelect({ selectedIds: ["collection-1", "collection-2", "collection-3"] })

    await userEvent.click(screen.getByRole("button", { name: "Remove Sale" }))

    expect(onChange).toHaveBeenCalledWith(["collection-1", "collection-3"])
  })

  it("hides the badges when the caller asks for a bare control", () => {
    renderSelect({ selectedIds: ["collection-1"], showSelectedBadges: false })

    expect(screen.queryByRole("button", { name: "Remove New arrivals" })).toBeNull()
  })

  it("blocks removal while the form is busy", () => {
    renderSelect({ disabled: true, selectedIds: ["collection-1"] })

    expect(screen.getByRole("button", { name: "Remove New arrivals" })).toBeDisabled()
  })
})

import { type JSX } from "react"

import { act, cleanup, renderHook, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import {
  AttributesSheetProvider,
  useAttributesSheet,
  useAttributesSheetState,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-sheet"

const TIMESTAMP = new Date("2026-01-15T10:00:00.000Z")

const attribute: ProductAttribute["adminListItem"] = {
  allowedValues: null,
  createdAt: TIMESTAMP,
  handle: "material",
  id: "attribute-1",
  productCount: 3,
  rank: 1,
  titles: { "en-US": "Material", "pl-PL": "Material" },
  type: "text",
  unit: null,
  updatedAt: TIMESTAMP,
}

const Consumer = (): JSX.Element => {
  const { attribute: selected, mode, open } = useAttributesSheet()

  return <p>{`${mode}|${String(open)}|${selected?.handle ?? "none"}`}</p>
}

afterEach(cleanup)

describe("useAttributesSheetState", () => {
  it("starts closed with nothing selected", () => {
    const { result } = renderHook(() => useAttributesSheetState())

    expect(result.current.mode).toBe("closed")
    expect(result.current.open).toBe(false)
    expect(result.current.attribute).toBeUndefined()
  })

  it("opens for a new attribute without carrying a row", () => {
    const { result } = renderHook(() => useAttributesSheetState())
    act(() => {
      result.current.openCreate()
    })

    expect(result.current.mode).toBe("create")
    expect(result.current.open).toBe(true)
    expect(result.current.attribute).toBeUndefined()
  })

  it("opens for editing the row it was handed", () => {
    const { result } = renderHook(() => useAttributesSheetState())
    act(() => {
      result.current.openEdit(attribute)
    })

    expect(result.current.mode).toBe("edit")
    expect(result.current.attribute).toStrictEqual(attribute)
  })

  it("forgets the edited row when it closes", () => {
    const { result } = renderHook(() => useAttributesSheetState())
    act(() => {
      result.current.openEdit(attribute)
    })
    act(() => {
      result.current.close()
    })

    expect(result.current.mode).toBe("closed")
    expect(result.current.attribute).toBeUndefined()
  })

  it("closes when the sheet reports it was dismissed", () => {
    const { result } = renderHook(() => useAttributesSheetState())
    act(() => {
      result.current.openEdit(attribute)
    })
    act(() => {
      result.current.setOpen(false)
    })

    expect(result.current.open).toBe(false)
  })

  it("never opens itself from a sheet that reports it is open", () => {
    const { result } = renderHook(() => useAttributesSheetState())
    act(() => {
      result.current.setOpen(true)
    })

    expect(result.current.mode).toBe("closed")
  })

  it("keeps the edit target while the sheet stays open", () => {
    const { result } = renderHook(() => useAttributesSheetState())
    act(() => {
      result.current.openEdit(attribute)
    })
    act(() => {
      result.current.setOpen(true)
    })

    expect(result.current.attribute).toStrictEqual(attribute)
  })

  it("keeps the same callbacks across renders so consumers do not rerender", () => {
    const { rerender, result } = renderHook(() => useAttributesSheetState())
    const first = result.current
    rerender()

    expect(result.current).toBe(first)
  })

  it("swaps the edit target when a second row is opened", () => {
    const { result } = renderHook(() => useAttributesSheetState())
    act(() => {
      result.current.openEdit(attribute)
    })
    act(() => {
      result.current.openEdit({ ...attribute, handle: "colour", id: "attribute-2" })
    })

    expect(result.current.attribute?.id).toBe("attribute-2")
  })

  it("drops the edit target when create is opened afterwards", () => {
    const { result } = renderHook(() => useAttributesSheetState())
    act(() => {
      result.current.openEdit(attribute)
    })
    act(() => {
      result.current.openCreate()
    })

    expect(result.current.mode).toBe("create")
    expect(result.current.attribute).toBeUndefined()
  })
})

describe("useAttributesSheet", () => {
  it("throws outside of a provider", () => {
    expect(() => renderHook(() => useAttributesSheet())).toThrow("useAttributesSheet must be used within AttributesSheetProvider")
  })

  it("hands the provided sheet api to its children", () => {
    const { result } = renderHook(() => useAttributesSheetState())
    act(() => {
      result.current.openEdit(attribute)
    })
    renderWithProviders(
      <AttributesSheetProvider value={result.current}>
        <Consumer />
      </AttributesSheetProvider>,
    )

    expect(screen.getByText("edit|true|material")).toBeInTheDocument()
  })

  it("hands a closed sheet api to its children", () => {
    const { result } = renderHook(() => useAttributesSheetState())
    renderWithProviders(
      <AttributesSheetProvider value={result.current}>
        <Consumer />
      </AttributesSheetProvider>,
    )

    expect(screen.getByText("closed|false|none")).toBeInTheDocument()
  })
})

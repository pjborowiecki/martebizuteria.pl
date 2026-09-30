import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderDataGridSkeletonContent } from "~/src/presentation/components/custom/datagrid/components/data-grid-skeleton-content"
import { type DataGridSkeletonVariant } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

const markupFor = (variant: DataGridSkeletonVariant | undefined): string =>
  render(renderDataGridSkeletonContent(variant)).container.innerHTML

const blocksFor = (variant: DataGridSkeletonVariant | undefined): string[] =>
  [...render(renderDataGridSkeletonContent(variant)).container.querySelectorAll('[data-slot="skeleton"]')].map((node) => node.className)

const VARIANTS: readonly DataGridSkeletonVariant[] = [
  "badge",
  "checkbox",
  "date",
  "icon",
  "iconEnd",
  "number",
  "recordId",
  "text",
  "thumbnail",
  "title",
]

describe("renderDataGridSkeletonContent", () => {
  afterEach(() => {
    cleanup()
  })

  it("falls back to a single wide bar when a column declares no variant", () => {
    const blocks = blocksFor(undefined)

    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toContain("h-4 w-full max-w-[80%]")
  })

  it("draws a pill for a badge column", () => {
    expect(blocksFor("badge")[0]).toContain("rounded-full")
  })

  it("centers a single square for a checkbox column", () => {
    const { container } = render(renderDataGridSkeletonContent("checkbox"))

    expect(container.firstElementChild?.className).toContain("justify-center")
    expect(blocksFor("checkbox")).toHaveLength(1)
  })

  it("right aligns numeric and trailing icon columns", () => {
    expect(render(renderDataGridSkeletonContent("number")).container.firstElementChild?.className).toContain("justify-end")
    expect(render(renderDataGridSkeletonContent("iconEnd")).container.firstElementChild?.className).toContain("justify-end")
  })

  it("stacks two bars for a title column so the subtitle is previewed too", () => {
    expect(blocksFor("title")).toHaveLength(2)
  })

  it("keeps a thumbnail from shrinking with the column", () => {
    expect(blocksFor("thumbnail")[0]).toContain("shrink-0")
  })

  it("renders a distinct shape for every declared variant", () => {
    const shapes = VARIANTS.map((variant) => markupFor(variant))

    expect(new Set(shapes).size).toBe(VARIANTS.length)
  })
})

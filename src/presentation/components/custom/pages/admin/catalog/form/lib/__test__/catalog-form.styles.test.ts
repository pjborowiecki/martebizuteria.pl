import { describe, expect, it } from "vite-plus/test"

import {
  SHEET_CONTROL_HEIGHT,
  SHEET_CONTROL_RADIUS_CLASS,
  sheetNumberInputNoSpinnerClassName,
} from "~/src/presentation/components/shadcn/sheet-control.styles"

import {
  CATALOG_FORM_DESCRIPTION_TEXTAREA_CLASS,
  CATALOG_SHEET_ACTION_BUTTON_CLASS,
  CATALOG_SHEET_CARD_CONTENT_CLASS,
  CATALOG_SHEET_FIELD_CLASS,
  CATALOG_SHEET_INLINE_INPUT_CLASS,
  CATALOG_SHEET_READ_ONLY_INPUT_CLASS,
  CATALOG_SHEET_TEXTAREA_CLASS,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.styles"

const classesOf = (value: string): Set<string> => new Set(value.split(" ").filter((entry) => entry !== ""))

describe("CATALOG_SHEET_ACTION_BUTTON_CLASS", () => {
  it("adopts the shared sheet control height and radius", () => {
    const classes = classesOf(CATALOG_SHEET_ACTION_BUTTON_CLASS)

    for (const token of SHEET_CONTROL_HEIGHT.split(" ")) {
      expect(classes).toContain(token)
    }
    expect(classes).toContain(SHEET_CONTROL_RADIUS_CLASS)
  })

  it("stays a fixed-width, single-line action", () => {
    const classes = classesOf(CATALOG_SHEET_ACTION_BUTTON_CLASS)

    expect(classes).toContain("min-w-[9.5rem]")
    expect(classes).toContain("shrink-0")
    expect(classes).toContain("whitespace-nowrap")
  })
})

describe("textarea classes", () => {
  it("gives the shared textarea the sheet radius and no resize handle", () => {
    const classes = classesOf(CATALOG_SHEET_TEXTAREA_CLASS)

    expect(classes).toContain(SHEET_CONTROL_RADIUS_CLASS)
    expect(classes).toContain("resize-none")
    expect(classes).toContain("min-h-[104px]")
  })

  it("only raises the minimum height for the description textarea", () => {
    expect(CATALOG_FORM_DESCRIPTION_TEXTAREA_CLASS).toBe("min-h-[168px]")
  })
})

describe("CATALOG_SHEET_READ_ONLY_INPUT_CLASS", () => {
  it("pins the control height so it lines up with editable fields", () => {
    const classes = classesOf(CATALOG_SHEET_READ_ONLY_INPUT_CLASS)

    expect(classes).toContain("h-10")
    expect(classes).toContain("min-h-10")
    expect(classes).toContain("max-h-10")
    expect(classes).toContain(SHEET_CONTROL_RADIUS_CLASS)
  })

  it("reads as a non-editable monospaced value", () => {
    const classes = classesOf(CATALOG_SHEET_READ_ONLY_INPUT_CLASS)

    expect(classes).toContain("cursor-default")
    expect(classes).toContain("font-mono")
    expect(classes).toContain("text-muted-foreground")
  })
})

describe("CATALOG_SHEET_FIELD_CLASS", () => {
  it("normalizes the height of inputs, input groups and select triggers alike", () => {
    const classes = classesOf(CATALOG_SHEET_FIELD_CLASS)

    expect(classes).toContain("[&_input]:h-10")
    expect(classes).toContain("[&_[data-slot=input-group]]:h-10")
    expect(classes).toContain("[&_[data-slot=select-trigger]]:h-10")
    expect(classes).toContain("gap-2")
  })
})

describe("CATALOG_SHEET_INLINE_INPUT_CLASS", () => {
  it("uses the shorter inline height instead of the full control height", () => {
    const classes = classesOf(CATALOG_SHEET_INLINE_INPUT_CLASS)

    expect(classes).toContain("h-8")
    expect(classes).toContain("max-h-8")
    expect(classes).not.toContain("h-10")
  })

  it("strips the number input spinner", () => {
    const classes = classesOf(CATALOG_SHEET_INLINE_INPUT_CLASS)

    for (const token of sheetNumberInputNoSpinnerClassName.split(" ")) {
      expect(classes).toContain(token)
    }
  })
})

describe("CATALOG_SHEET_CARD_CONTENT_CLASS", () => {
  it("spaces the sections of a sheet card", () => {
    expect(CATALOG_SHEET_CARD_CONTENT_CLASS).toBe("space-y-6")
  })
})

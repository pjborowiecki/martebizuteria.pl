import { describe, expect, it } from "vite-plus/test"

import { type ProductOptionDraft } from "~/src/modules/product-variant/product-variant.utils"

import {
  IMPLICIT_VARIANT_OPTION_TITLES,
  createImplicitVariantOptionSetup,
  ensureImplicitVariantOptions,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-variant-form.utils"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/u

const namedOption = (title: string): ProductOptionDraft => ({
  id: "option-1",
  titles: { "en-US": title, "pl-PL": title },
  values: [{ id: "value-1", labels: { "en-US": "Gold", "pl-PL": "Złoto" } }],
})

describe("createImplicitVariantOptionSetup", () => {
  it("names the option after the localized implicit title", () => {
    expect(createImplicitVariantOptionSetup().titles).toStrictEqual({ "en-US": "Variant", "pl-PL": "Wariant" })
  })

  it("seeds exactly one blank value carrying a fresh uuid", () => {
    const setup = createImplicitVariantOptionSetup()

    expect(setup.values).toHaveLength(1)
    expect(setup.values[0]?.labels).toStrictEqual({ "en-US": "", "pl-PL": "" })
    expect(setup.values[0]?.id).toMatch(UUID_PATTERN)
  })

  it("does not share the implicit titles object between calls", () => {
    expect(createImplicitVariantOptionSetup().titles).not.toBe(IMPLICIT_VARIANT_OPTION_TITLES)
  })

  it("issues a distinct value id per call", () => {
    expect(createImplicitVariantOptionSetup().values[0]?.id).not.toBe(createImplicitVariantOptionSetup().values[0]?.id)
  })
})

describe("ensureImplicitVariantOptions", () => {
  it("creates the implicit option when the product has none", () => {
    const [option, ...rest] = ensureImplicitVariantOptions([])

    expect(rest).toStrictEqual([])
    expect(option.titles).toStrictEqual(IMPLICIT_VARIANT_OPTION_TITLES)
    expect(option.values).toHaveLength(1)
  })

  it("keeps a named single option exactly as authored", () => {
    const [option] = ensureImplicitVariantOptions([namedOption("Material")])

    expect(option.titles).toStrictEqual({ "en-US": "Material", "pl-PL": "Material" })
    expect(option.values).toStrictEqual([{ id: "value-1", labels: { "en-US": "Gold", "pl-PL": "Złoto" } }])
  })

  it("names an untitled single option with the implicit title", () => {
    const [option] = ensureImplicitVariantOptions([
      { id: "option-1", titles: { "en-US": "  ", "pl-PL": "" }, values: [{ id: "value-1", labels: { "en-US": "S", "pl-PL": "S" } }] },
    ])

    expect(option.titles).toStrictEqual(IMPLICIT_VARIANT_OPTION_TITLES)
  })

  it("keeps a single option titled in only one locale", () => {
    const [option] = ensureImplicitVariantOptions([
      { id: "option-1", titles: { "en-US": "Size", "pl-PL": "" }, values: [{ id: "value-1", labels: { "en-US": "S", "pl-PL": "S" } }] },
    ])

    expect(option.titles).toStrictEqual({ "en-US": "Size", "pl-PL": "" })
  })

  it("gives a valueless single option one blank value to edit", () => {
    const [option] = ensureImplicitVariantOptions([{ id: "option-1", titles: { "en-US": "Size", "pl-PL": "Rozmiar" }, values: [] }])

    expect(option.values).toHaveLength(1)
    expect(option.values[0]?.labels).toStrictEqual({ "en-US": "", "pl-PL": "" })
    expect(option.values[0]?.id).toMatch(UUID_PATTERN)
  })

  it("clones every option when the product has more than one", () => {
    const source: ProductOptionDraft[] = [
      namedOption("Material"),
      {
        id: "option-2",
        titles: { "en-US": "Size", "pl-PL": "Rozmiar" },
        values: [{ id: "value-2", labels: { "en-US": "S", "pl-PL": "S" } }],
      },
    ]
    const result = ensureImplicitVariantOptions(source)

    expect(result).toHaveLength(2)
    expect(result[0]).not.toBe(source[0])
    expect(result[0].titles).not.toBe(source[0]?.titles)
    expect(result[1]?.titles).toStrictEqual({ "en-US": "Size", "pl-PL": "Rozmiar" })
    expect(result[1]?.values).toStrictEqual([{ id: "value-2", labels: { "en-US": "S", "pl-PL": "S" } }])
  })

  it("leaves a second untitled option untitled instead of renaming it", () => {
    const result = ensureImplicitVariantOptions([
      namedOption("Material"),
      { id: "option-2", titles: { "en-US": "", "pl-PL": "" }, values: [] },
    ])

    expect(result[1]?.titles).toStrictEqual({ "en-US": "", "pl-PL": "" })
    expect(result[1]?.values).toStrictEqual([])
  })
})

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Product } from "~/src/modules/product/product.types"

import { ProductHeroDetails } from "~/src/presentation/components/custom/pages/product-page/product-hero-details"

const spec = (overrides: Partial<Product["specification"]>): Product["specification"] => ({
  allowedValues: null,
  handle: "material",
  rank: 0,
  titles: { "en-US": "Material", "pl-PL": "Material" },
  type: "text",
  unit: null,
  value: "Silver",
  ...overrides,
})

const weightSpec = (overrides: Partial<Product["specification"]> = {}) =>
  spec({ handle: "weight", titles: { "en-US": "Weight", "pl-PL": "Waga" }, value: "12", ...overrides })

const leadTimeSpec = (value: string) =>
  spec({ handle: "czas-realizacji", titles: { "en-US": "Lead time", "pl-PL": "Czas realizacji" }, value })

const sectionNames = () => screen.getAllByRole("button").map((button) => button.textContent)

describe("ProductHeroDetails sections", () => {
  afterEach(() => {
    cleanup()
  })

  it("opens the description first when the product has one", () => {
    renderWithProviders(<ProductHeroDetails description="A hand made ring." specifications={[]} />)

    expect(sectionNames()).toStrictEqual(["Description", "Additional information"])
    expect(screen.getByText("A hand made ring.")).toBeVisible()
  })

  it("leaves out the description section for a product without copy", () => {
    renderWithProviders(<ProductHeroDetails description="   " specifications={[spec({})]} />)

    expect(sectionNames()).toStrictEqual(["Details", "Additional information"])
  })

  it("always offers the additional information section", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[]} />)

    expect(sectionNames()).toStrictEqual(["Additional information"])
  })

  it("keeps the additional information closed while the description leads", async () => {
    renderWithProviders(<ProductHeroDetails description="A hand made ring." specifications={[]} />)

    expect(screen.queryByText("Order fulfillment time is up to 10 business days.")).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Additional information" }))

    expect(await screen.findByText("Order fulfillment time is up to 10 business days.")).toBeVisible()
  })
})

describe("ProductHeroDetails specifications", () => {
  afterEach(() => {
    cleanup()
  })

  it("lists the specification titles and values", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[weightSpec({ type: "number", unit: "g" })]} />)

    expect(screen.getByText("Weight")).toBeVisible()
    expect(screen.getByText("12 g")).toBeVisible()
  })

  it("sorts the specifications by their rank", () => {
    renderWithProviders(
      <ProductHeroDetails description="" specifications={[weightSpec({ rank: 2 }), spec({ rank: 1, value: "Silver" })]} />,
    )

    expect(screen.getAllByRole("term").map((term) => term.textContent)).toStrictEqual(["Material", "Weight"])
  })

  it("drops a specification whose value is blank", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[spec({}), weightSpec({ value: "  " })]} />)

    expect(screen.getByText("Material")).toBeVisible()
    expect(screen.queryByText("Weight")).toBeNull()
  })

  it("keeps the fulfillment time out of the specification list", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[leadTimeSpec("3 days")]} />)

    expect(sectionNames()).toStrictEqual(["Additional information"])
    expect(screen.queryByText("Lead time")).toBeNull()
  })

  it("resolves a select specification to its localized label", () => {
    renderWithProviders(
      <ProductHeroDetails
        description=""
        specifications={[
          spec({
            allowedValues: [{ labels: { "en-US": "Sterling silver", "pl-PL": "Srebro" }, value: "silver-925" }],
            type: "select",
            value: "silver-925",
          }),
        ]}
      />,
    )

    expect(screen.getByText("Sterling silver")).toBeVisible()
  })
})

describe("ProductHeroDetails additional information", () => {
  afterEach(() => {
    cleanup()
  })

  it("promises the fulfillment time the product declares", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[leadTimeSpec("3 days")]} />)

    expect(screen.getByText("Order fulfillment time is up to 3 days.")).toBeVisible()
  })

  it("falls back to the standard fulfillment window when the product declares none", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[]} />)

    expect(screen.getByText("Order fulfillment time is up to 10 business days.")).toBeVisible()
  })

  it("ignores a blank fulfillment time", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[leadTimeSpec("   ")]} />)

    expect(screen.getByText("Order fulfillment time is up to 10 business days.")).toBeVisible()
  })

  it("offers the workshop email as a mail link", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[]} />)

    expect(screen.getByRole("link", { name: "kontakt@martebizuteria.pl" })).toHaveAttribute("href", "mailto:kontakt@martebizuteria.pl")
  })

  it("explains the gift box and the handmade character", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[]} />)

    expect(screen.getByText("Elegant gift box")).toBeVisible()
    expect(screen.getByText("One-of-a-kind character")).toBeVisible()
  })
})

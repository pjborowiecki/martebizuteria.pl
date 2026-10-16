import { QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { TEST_SELLER_DETAILS, createSellerDetailsQueryClient } from "~/src/platform/testing/mocks/seller-details"

import { type Product } from "~/src/modules/product/product.types"

import { ProductHeroDetails } from "~/src/presentation/components/custom/pages/product-page/product-hero-details"

import polishProductMessages from "~/messages/pl-PL/pages.product.json"

vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})

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
    renderWithProviders(<ProductHeroDetails description="A hand made ring." specifications={[]} />, {
      queryClient: createSellerDetailsQueryClient(),
    })

    expect(sectionNames()).toStrictEqual(["Description", "Additional information", "Manufacturer"])
    expect(screen.getByText("A hand made ring.")).toBeVisible()
  })

  it("leaves out the description section for a product without copy", () => {
    renderWithProviders(<ProductHeroDetails description="   " specifications={[spec({})]} />, {
      queryClient: createSellerDetailsQueryClient(),
    })

    expect(sectionNames()).toStrictEqual(["Details", "Additional information", "Manufacturer"])
  })

  it("always offers the additional information and manufacturer sections", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[]} />, { queryClient: createSellerDetailsQueryClient() })

    expect(sectionNames()).toStrictEqual(["Additional information", "Manufacturer"])
  })

  it("keeps the additional information closed while the description leads", async () => {
    renderWithProviders(<ProductHeroDetails description="A hand made ring." specifications={[]} />, {
      queryClient: createSellerDetailsQueryClient(),
    })

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
    renderWithProviders(<ProductHeroDetails description="" specifications={[weightSpec({ type: "number", unit: "g" })]} />, {
      queryClient: createSellerDetailsQueryClient(),
    })

    expect(screen.getByText("Weight")).toBeVisible()
    expect(screen.getByText("12 g")).toBeVisible()
  })

  it("sorts the specifications by their rank", () => {
    renderWithProviders(
      <ProductHeroDetails description="" specifications={[weightSpec({ rank: 2 }), spec({ rank: 1, value: "Silver" })]} />,
      { queryClient: createSellerDetailsQueryClient() },
    )

    expect(screen.getAllByRole("term").map((term) => term.textContent)).toStrictEqual(["Material", "Weight"])
  })

  it("drops a specification whose value is blank", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[spec({}), weightSpec({ value: "  " })]} />, {
      queryClient: createSellerDetailsQueryClient(),
    })

    expect(screen.getByText("Material")).toBeVisible()
    expect(screen.queryByText("Weight")).toBeNull()
  })

  it("keeps the fulfillment time out of the specification list", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[leadTimeSpec("3 days")]} />, {
      queryClient: createSellerDetailsQueryClient(),
    })

    expect(sectionNames()).toStrictEqual(["Additional information", "Manufacturer"])
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
      { queryClient: createSellerDetailsQueryClient() },
    )

    expect(screen.getByText("Sterling silver")).toBeVisible()
  })
})

describe("ProductHeroDetails additional information", () => {
  afterEach(() => {
    cleanup()
  })

  it("promises the fulfillment time the product declares", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[leadTimeSpec("3 days")]} />, {
      queryClient: createSellerDetailsQueryClient(),
    })

    expect(screen.getByText("Order fulfillment time is up to 3 days.")).toBeVisible()
  })

  it("falls back to the standard fulfillment window when the product declares none", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[]} />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByText("Order fulfillment time is up to 10 business days.")).toBeVisible()
  })

  it("ignores a blank fulfillment time", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[leadTimeSpec("   ")]} />, {
      queryClient: createSellerDetailsQueryClient(),
    })

    expect(screen.getByText("Order fulfillment time is up to 10 business days.")).toBeVisible()
  })

  it("offers the seller's stored email as a mail link", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[]} />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByText(/Write to us at/u)).toHaveTextContent(`Write to us at ${TEST_SELLER_DETAILS.email}`)
    expect(screen.getByRole("link", { name: TEST_SELLER_DETAILS.email })).toHaveAttribute("href", `mailto:${TEST_SELLER_DETAILS.email}`)
  })

  it("explains the gift box and the handmade character", () => {
    renderWithProviders(<ProductHeroDetails description="" specifications={[]} />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByText("Elegant gift box")).toBeVisible()
    expect(screen.getByText("One-of-a-kind character")).toBeVisible()
  })
})

describe("ProductHeroDetails manufacturer", () => {
  afterEach(() => {
    cleanup()
  })

  it("names the shop as the manufacturer with its postal address and email", async () => {
    renderWithProviders(<ProductHeroDetails description="A hand made ring." specifications={[]} />, {
      queryClient: createSellerDetailsQueryClient(),
    })

    await userEvent.click(screen.getByRole("button", { name: "Manufacturer" }))

    const details = await screen.findAllByRole("definition")
    expect(details.map((detail) => detail.textContent)).toStrictEqual([
      ["Pracownia Testowa Anna Nowak", "ul. Floriańska 1", "31-001 Kraków", "Poland"].join("\n"),
      TEST_SELLER_DETAILS.email,
    ])
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toStrictEqual(["Name and postal address", "Email address"])
    expect(screen.getAllByRole("link", { name: TEST_SELLER_DETAILS.email }).at(-1)).toHaveAttribute(
      "href",
      `mailto:${TEST_SELLER_DETAILS.email}`,
    )
  })

  it("labels the manufacturer in Polish for the Polish storefront", async () => {
    render(
      <QueryClientProvider client={createSellerDetailsQueryClient()}>
        <IntlProvider locale="pl-PL" messages={{ pages: { product: polishProductMessages } }}>
          <ProductHeroDetails description="" specifications={[]} />
        </IntlProvider>
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Producent" }))

    expect(await screen.findByText("Nazwa i adres pocztowy")).toBeVisible()
    expect(screen.getByText("Adres e-mail")).toBeVisible()
    expect(screen.getByText("Pracownia Testowa Anna Nowak ul. Floriańska 1 31-001 Kraków Polska")).toBeVisible()
  })
})

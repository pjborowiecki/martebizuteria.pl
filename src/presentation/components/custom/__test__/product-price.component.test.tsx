import { cleanup, render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { DisplayPreferencesContext } from "~/src/hooks/use-display-format"

import { ProductPrice } from "~/src/presentation/components/custom/product-price"

import polishCopy from "~/messages/pl-PL/components.custom.json"

const REDUCTION = { lowestPrice: 28_000 }

afterEach(cleanup)

describe("ProductPrice", () => {
  it("shows only the price of a variant that is not reduced", () => {
    const { container } = renderWithProviders(<ProductPrice className="text-lg" price="PLN 200.00" priceReduction={undefined} />)

    expect(container).toHaveTextContent(/^PLN 200\.00$/u)
    expect(screen.getByText("PLN 200.00")).toHaveClass("text-lg")
  })

  it("measures the reduction from the lowest price of the 30 days before it, struck through and named under the price", () => {
    renderWithProviders(<ProductPrice className="text-lg" price="PLN 200.00" priceReduction={REDUCTION} />)

    expect(screen.getByText("PLN 280.00").tagName).toBe("S")
    expect(screen.getByText("PLN 280.00")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByText("Lowest price in the 30 days before the reduction: PLN 280.00")).toBeInTheDocument()
  })

  it("formats the lowest price for the shopper's format locale while keeping the page's wording", () => {
    renderWithProviders(
      <DisplayPreferencesContext value={{ formatLocale: "de-DE", timeZone: "Europe/Berlin" }}>
        <ProductPrice className="text-lg" price="200,00 PLN" priceReduction={REDUCTION} />
      </DisplayPreferencesContext>,
    )

    expect(screen.getByText("Lowest price in the 30 days before the reduction: 280,00 PLN")).toBeInTheDocument()
  })

  it("words the lowest price the way Polish law expects", () => {
    render(
      <IntlProvider locale="pl-PL" messages={{ components: { custom: polishCopy } }} timeZone={I18N.DEFAULT_TIMEZONE}>
        <ProductPrice className="text-lg" price="200,00 zł" priceReduction={REDUCTION} />
      </IntlProvider>,
    )

    expect(screen.getByText("Najniższa cena z 30 dni przed obniżką: 280,00 zł")).toBeInTheDocument()
    expect(screen.getByText("280,00 zł").tagName).toBe("S")
  })
})

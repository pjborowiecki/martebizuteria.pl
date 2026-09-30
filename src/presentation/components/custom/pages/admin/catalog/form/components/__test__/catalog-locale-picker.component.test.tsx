import { type ReactNode } from "react"

import { cleanup, renderHook, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  CatalogLocalePickerBar,
  CatalogLocalePickerLayout,
  CatalogLocalePickerProvider,
  useCatalogActiveLocale,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"

const HINT = "required names in each language"

const ActiveLocaleWrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <CatalogLocalePickerProvider activeLocale="en-US">{children}</CatalogLocalePickerProvider>
)

describe("useCatalogActiveLocale", () => {
  afterEach(() => {
    cleanup()
  })

  it("throws outside the provider", () => {
    expect(() => renderHook(() => useCatalogActiveLocale())).toThrow(
      "useCatalogActiveLocale must be used within CatalogLocalePickerProvider",
    )
  })

  it("exposes the active locale the provider holds", () => {
    const { result } = renderHook(() => useCatalogActiveLocale(), { wrapper: ActiveLocaleWrapper })

    expect(result.current).toBe("en-US")
  })
})

describe("CatalogLocalePickerBar", () => {
  afterEach(() => {
    cleanup()
  })

  it("counts how many locales are filled", () => {
    renderWithProviders(
      <CatalogLocalePickerBar
        filledCountHint={HINT}
        fills={{ "en-US": true, "pl-PL": false }}
        onLocaleChange={vi.fn(() => {})}
        value="pl-PL"
      />,
    )

    expect(screen.getByText(/1 of 2 filled/u)).toBeInTheDocument()
  })

  it("counts every locale when all are filled", () => {
    renderWithProviders(
      <CatalogLocalePickerBar
        filledCountHint={HINT}
        fills={{ "en-US": true, "pl-PL": true }}
        onLocaleChange={vi.fn(() => {})}
        value="pl-PL"
      />,
    )

    expect(screen.getByText(/2 of 2 filled/u)).toBeInTheDocument()
  })

  it("renders the hint next to the progress", () => {
    renderWithProviders(
      <CatalogLocalePickerBar
        filledCountHint={HINT}
        fills={{ "en-US": false, "pl-PL": false }}
        onLocaleChange={vi.fn(() => {})}
        value="pl-PL"
      />,
    )

    expect(screen.getByText(`· ${HINT}`)).toBeInTheDocument()
  })

  it("labels the select and shows the active locale in upper case", () => {
    renderWithProviders(
      <CatalogLocalePickerBar
        filledCountHint={HINT}
        fills={{ "en-US": false, "pl-PL": true }}
        onLocaleChange={vi.fn(() => {})}
        value="en-US"
      />,
    )

    const trigger = screen.getByLabelText("Language")

    expect(trigger).toHaveTextContent("EN-US")
    expect(trigger).toHaveAttribute("aria-invalid", "false")
  })

  it("hides the incomplete alert while there is no submit error", () => {
    renderWithProviders(
      <CatalogLocalePickerBar
        filledCountHint={HINT}
        fills={{ "en-US": false, "pl-PL": true }}
        incompleteLocales={["en-US"]}
        onLocaleChange={vi.fn(() => {})}
        value="pl-PL"
      />,
    )

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("names the incomplete locales once the submit error is raised", () => {
    renderWithProviders(
      <CatalogLocalePickerBar
        filledCountHint={HINT}
        fills={{ "en-US": false, "pl-PL": true }}
        incompleteLocales={["en-US"]}
        onLocaleChange={vi.fn(() => {})}
        showSubmitError
        value="pl-PL"
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Complete required fields for: EN-US.")
    expect(screen.getByLabelText("Language")).toHaveAttribute("aria-invalid", "true")
  })

  it("asks the form to switch to the locale the editor picks", async () => {
    const onLocaleChange = vi.fn<(locale: string) => void>()
    renderWithProviders(
      <CatalogLocalePickerBar
        filledCountHint={HINT}
        fills={{ "en-US": true, "pl-PL": false }}
        onLocaleChange={onLocaleChange}
        value="en-US"
      />,
    )
    await userEvent.click(screen.getByLabelText("Language"))
    const options = await screen.findAllByRole("option")
    const polish = options.find((option) => option.textContent === "PL-PL")
    if (polish === undefined) {
      throw new Error("the locale picker offers no Polish option")
    }
    await userEvent.click(polish)

    expect(onLocaleChange).toHaveBeenCalledWith("pl-PL")
  })

  it("offers one option per shop locale", async () => {
    renderWithProviders(
      <CatalogLocalePickerBar
        filledCountHint={HINT}
        fills={{ "en-US": true, "pl-PL": false }}
        onLocaleChange={vi.fn(() => {})}
        value="en-US"
      />,
    )
    await userEvent.click(screen.getByLabelText("Language"))
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["PL-PL", "EN-US"])
  })

  it("hides the alert when the submit error carries no locales", () => {
    renderWithProviders(
      <CatalogLocalePickerBar
        filledCountHint={HINT}
        fills={{ "en-US": false, "pl-PL": true }}
        onLocaleChange={vi.fn(() => {})}
        showSubmitError
        value="pl-PL"
      />,
    )

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

describe("CatalogLocalePickerLayout", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the bar above its children and shares the active locale", () => {
    renderWithProviders(
      <CatalogLocalePickerLayout
        activeLocale="en-US"
        filledCountHint={HINT}
        fills={{ "en-US": true, "pl-PL": false }}
        onLocaleChange={vi.fn(() => {})}
      >
        <p>form body</p>
      </CatalogLocalePickerLayout>,
    )

    expect(screen.getByLabelText("Language")).toHaveTextContent("EN-US")
    expect(screen.getByText("form body")).toBeInTheDocument()
  })
})

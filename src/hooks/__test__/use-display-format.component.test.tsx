import { type JSX } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { DisplayPreferencesContext, useDisplayTimeZone, useFormatLocale, useFormatter } from "~/src/hooks/use-display-format"

const INSTANT = new Date("2026-06-15T23:30:00.000Z")

const Probe = (): JSX.Element => {
  const format = useFormatter()

  return (
    <dl>
      <dt>locale</dt>
      <dd data-testid="locale">{useFormatLocale()}</dd>
      <dt>zone</dt>
      <dd data-testid="zone">{useDisplayTimeZone()}</dd>
      <dt>time</dt>
      <dd data-testid="time">{format.dateTime(INSTANT, { hour: "2-digit", minute: "2-digit" })}</dd>
      <dt>number</dt>
      <dd data-testid="number">{format.number(1234.5)}</dd>
    </dl>
  )
}

afterEach(cleanup)

describe("display formatting hooks", () => {
  it("format in the user's locale and time zone, separately from the language of the page", () => {
    render(
      <IntlProvider locale="pl-PL" messages={{}} timeZone="Europe/Warsaw">
        <DisplayPreferencesContext value={{ formatLocale: "en-US", timeZone: "America/New_York" }}>
          <Probe />
        </DisplayPreferencesContext>
      </IntlProvider>,
    )

    expect(screen.getByTestId("locale")).toHaveTextContent("en-US")
    expect(screen.getByTestId("zone")).toHaveTextContent("America/New_York")
    expect(screen.getByTestId("time")).toHaveTextContent("07:30 PM")
    expect(screen.getByTestId("number")).toHaveTextContent("1,234.5")
  })

  it("follow the page's language and time zone where no preferences are provided", () => {
    render(
      <IntlProvider locale="pl-PL" messages={{}} timeZone="Europe/Warsaw">
        <Probe />
      </IntlProvider>,
    )

    expect(screen.getByTestId("locale")).toHaveTextContent("pl-PL")
    expect(screen.getByTestId("zone")).toHaveTextContent("Europe/Warsaw")
    expect(screen.getByTestId("time")).toHaveTextContent("01:30")
    expect(screen.getByTestId("number")).toHaveTextContent("1234,5")
  })

  it("fall back to UTC when the page sets no time zone either", () => {
    render(
      <IntlProvider locale="en-US" messages={{}} onError={vi.fn<() => void>()}>
        <Probe />
      </IntlProvider>,
    )

    expect(screen.getByTestId("zone")).toHaveTextContent("UTC")
    expect(screen.getByTestId("time")).toHaveTextContent("11:30 PM")
  })
})

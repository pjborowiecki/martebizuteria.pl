import { type JSX } from "react"

import { cleanup, fireEvent, screen } from "@testing-library/react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DATE_COLUMN_FILTER_OPERATOR, type DateColumnFilterOperator } from "~/src/modules/_core/utils/column-filters"

import {
  CustomersDateFilterForm,
  type DateFilterDraft,
} from "~/src/presentation/components/custom/pages/admin/customers/components/customers-date-filter-form"

const TODAY_ISO = "2026-03-15"

const OPERATOR_OPTIONS: readonly { readonly label: string; readonly value: DateColumnFilterOperator }[] = [
  { label: "On", value: DATE_COLUMN_FILTER_OPERATOR.ON },
  { label: "Date range", value: DATE_COLUMN_FILTER_OPERATOR.BETWEEN },
]

const draft = (overrides: Partial<DateFilterDraft> = {}): DateFilterDraft => ({
  date: "",
  endDate: "",
  operator: DATE_COLUMN_FILTER_OPERATOR.ON,
  startDate: "",
  ...overrides,
})

const createIsoDateSpy = () => vi.fn<(isoDate: string) => void>()

const createOperatorSpy = () => vi.fn<(value: string | null) => void>()

const Harness = ({
  onDateChange = createIsoDateSpy(),
  onEndDateChange = createIsoDateSpy(),
  onStartDateChange = createIsoDateSpy(),
  values,
}: Readonly<{
  onDateChange?: (isoDate: string) => void
  onEndDateChange?: (isoDate: string) => void
  onStartDateChange?: (isoDate: string) => void
  values: DateFilterDraft
}>): JSX.Element => {
  const t = useTranslations("pages.admin.customers")

  return (
    <CustomersDateFilterForm
      draft={values}
      onDateChange={onDateChange}
      onEndDateChange={onEndDateChange}
      onOperatorChange={createOperatorSpy()}
      onStartDateChange={onStartDateChange}
      operatorOptions={OPERATOR_OPTIONS}
      t={t}
      todayIso={TODAY_ISO}
    />
  )
}

afterEach(() => {
  cleanup()
})

describe("CustomersDateFilterForm single date mode", () => {
  it("offers one date picker labelled from the messages", () => {
    renderWithProviders(<Harness values={draft()} />)

    expect(screen.getByText("Condition")).toBeInTheDocument()
    expect(screen.getByLabelText("Date")).toBeInTheDocument()
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("To")).not.toBeInTheDocument()
  })

  it("shows the placeholder while no date is chosen", () => {
    renderWithProviders(<Harness values={draft()} />)

    expect(screen.getByLabelText("Date")).toHaveTextContent("Select date")
  })

  it("shows the chosen date instead of the placeholder", () => {
    renderWithProviders(<Harness values={draft({ date: "2026-02-01" })} />)

    expect(screen.getByLabelText("Date")).not.toHaveTextContent("Select date")
    expect(screen.getByLabelText("Date")).toHaveTextContent("2/1/26")
  })

  it("reports today's date when the admin picks Today", () => {
    const onDateChange = createIsoDateSpy()
    renderWithProviders(<Harness onDateChange={onDateChange} values={draft()} />)
    fireEvent.click(screen.getByLabelText("Date"))
    fireEvent.click(screen.getByText("Today"))

    expect(onDateChange).toHaveBeenCalledWith(TODAY_ISO)
  })

  it("cannot clear a date that was never chosen", () => {
    renderWithProviders(<Harness values={draft()} />)
    fireEvent.click(screen.getByLabelText("Date"))

    expect(screen.getByText("Clear date")).toBeDisabled()
  })

  it("clears the chosen date to an empty value", () => {
    const onDateChange = createIsoDateSpy()
    renderWithProviders(<Harness onDateChange={onDateChange} values={draft({ date: "2026-02-01" })} />)
    fireEvent.click(screen.getByLabelText("Date"))
    fireEvent.click(screen.getByText("Clear date"))

    expect(onDateChange).toHaveBeenCalledWith("")
  })
})

describe("CustomersDateFilterForm range mode", () => {
  it("swaps the single picker for a start and an end picker", () => {
    renderWithProviders(<Harness values={draft({ operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN })} />)

    expect(screen.getByLabelText("From")).toBeInTheDocument()
    expect(screen.getByLabelText("To")).toBeInTheDocument()
    expect(screen.queryByLabelText("Date")).not.toBeInTheDocument()
  })

  it("shows both ends of a chosen range", () => {
    renderWithProviders(
      <Harness values={draft({ endDate: "2026-02-28", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2026-02-01" })} />,
    )

    expect(screen.getByLabelText("From")).toHaveTextContent("2/1/26")
    expect(screen.getByLabelText("To")).toHaveTextContent("2/28/26")
  })

  it("reports the start and the end separately", () => {
    const onStartDateChange = createIsoDateSpy()
    const onEndDateChange = createIsoDateSpy()
    renderWithProviders(
      <Harness
        onEndDateChange={onEndDateChange}
        onStartDateChange={onStartDateChange}
        values={draft({ operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN })}
      />,
    )
    fireEvent.click(screen.getByLabelText("From"))
    fireEvent.click(screen.getByText("Today"))

    expect(onStartDateChange).toHaveBeenCalledWith(TODAY_ISO)
    expect(onEndDateChange).not.toHaveBeenCalled()
  })

  it("keeps a day after the end of the range out of reach of the start picker", () => {
    renderWithProviders(
      <Harness values={draft({ endDate: "2026-02-10", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2026-02-01" })} />,
    )
    fireEvent.click(screen.getByLabelText("From"))

    expect(screen.getByRole("button", { name: "Wednesday, February 11th, 2026" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Monday, February 9th, 2026" })).not.toBeDisabled()
  })

  it("keeps a day before the start of the range out of reach of the end picker", () => {
    renderWithProviders(
      <Harness values={draft({ endDate: "2026-02-10", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2026-02-05" })} />,
    )
    fireEvent.click(screen.getByLabelText("To"))

    expect(screen.getByRole("button", { name: "Wednesday, February 4th, 2026" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Friday, February 6th, 2026" })).not.toBeDisabled()
  })

  it("keeps a future day out of reach of the end picker", () => {
    renderWithProviders(
      <Harness values={draft({ endDate: "2026-03-10", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2026-03-01" })} />,
    )
    fireEvent.click(screen.getByLabelText("To"))

    expect(screen.getByRole("button", { name: "Monday, March 16th, 2026" })).toBeDisabled()
  })
})

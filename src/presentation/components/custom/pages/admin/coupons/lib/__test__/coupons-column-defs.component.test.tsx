import { type JSX, useMemo } from "react"

import { flexRender, useTable } from "@tanstack/react-table"
import { cleanup, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { markAsCut } from "~/src/platform/testing/lib/cut-text"
import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_DISCOUNT_TABLE_COLUMN_ID, ADMIN_DISCOUNT_TABLE_COLUMN_SIZE, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

vi.mock("~/src/presentation/components/custom/pages/admin/coupons/components/coupons-row-actions", () => ({
  CouponsRowActions: (): JSX.Element => <span>row actions</span>,
}))

import { buildCoupon } from "~/src/presentation/components/custom/pages/admin/coupons/__test__/coupon.fixture"
import { buildCouponColumns } from "~/src/presentation/components/custom/pages/admin/coupons/lib/coupons-column-defs"

type CouponRow = Discount["adminListItem"]

const LARGE_AMOUNT = /123[\s,.]456/u

const LONG_USAGE = /^123[\s,.]?456 \/ 1[\s,.]?000[\s,.]?000$/u

const ColumnsProbe = ({ row }: Readonly<{ row: CouponRow }>): JSX.Element => {
  const t = useTranslations("pages.admin.coupons")
  const tAdmin = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()
  const columns = useMemo(() => buildCouponColumns({ format, locale, t, tAdmin }), [format, locale, t, tAdmin])
  const table = useTable<DataGridFeatures, CouponRow>({
    columns,
    data: [row],
    features: dataGridFeatures,
    getRowId: (item) => item.id,
  })
  const [tableRow] = table.getRowModel().rows

  return (
    <div>
      {tableRow?.getVisibleCells().map((visibleCell) => (
        <span key={visibleCell.id} data-testid={`cell-${visibleCell.column.id}`}>
          {flexRender(visibleCell.column.columnDef.cell, visibleCell.getContext())}
        </span>
      ))}
    </div>
  )
}

const renderColumns = (overrides: Partial<CouponRow> = {}): void => {
  renderWithProviders(<ColumnsProbe row={buildCoupon(overrides)} />)
}

const cell = (id: string): HTMLElement => screen.getByTestId(`cell-${id}`)

const renderDefinitions = () => {
  const definitions: { current?: ReturnType<typeof buildCouponColumns> } = {}
  const Probe = (): null => {
    const t = useTranslations("pages.admin.coupons")
    const tAdmin = useTranslations("pages.admin")
    const format = useFormatter()
    const locale = useLocale()
    definitions.current = buildCouponColumns({ format, locale, t, tAdmin })

    return null
  }
  renderWithProviders(<Probe />)

  return new Map((definitions.current ?? []).map((column) => [column.id, column]))
}

afterEach(cleanup)

describe("buildCouponColumns sizes", () => {
  it("keeps the status and date columns wide enough to read in full", () => {
    const byId = renderDefinitions()

    expect(byId.get(ADMIN_DISCOUNT_TABLE_COLUMN_ID.status)?.minSize).toBe(ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.status)
    expect(byId.get(ADMIN_DISCOUNT_TABLE_COLUMN_ID.startsAt)?.minSize).toBe(ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.startsAt)
    expect(byId.get(ADMIN_DISCOUNT_TABLE_COLUMN_ID.endsAt)?.minSize).toBe(ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.endsAt)
    expect(byId.get(ADMIN_DISCOUNT_TABLE_COLUMN_ID.createdAt)?.minSize).toBe(ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.createdAt)
  })

  it("keeps the discount and minimum order columns wide enough for their amounts", () => {
    const byId = renderDefinitions()

    expect(byId.get(ADMIN_DISCOUNT_TABLE_COLUMN_ID.value)?.minSize).toBe(ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.value)
    expect(byId.get(ADMIN_DISCOUNT_TABLE_COLUMN_ID.minOrder)?.minSize).toBe(ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.minOrder)
  })
})

describe("buildCouponColumns amounts", () => {
  it("cuts a large fixed discount short and shows it in full on hover", async () => {
    renderColumns({ type: DISCOUNT_TYPE.FIXED_AMOUNT, value: 12_345_678 })
    const discount = within(cell(ADMIN_DISCOUNT_TABLE_COLUMN_ID.value)).getByText(LARGE_AMOUNT)

    expect(discount).toHaveClass("truncate", "min-w-0", "font-mono")

    await userEvent.hover(markAsCut(discount))

    expect(await screen.findByText(LARGE_AMOUNT, { selector: "[data-slot='tooltip-content']" })).toBeInTheDocument()
  })

  it("cuts a large minimum order short inside its column", () => {
    renderColumns({ minOrderTotalMinorUnits: 12_345_678 })

    expect(within(cell(ADMIN_DISCOUNT_TABLE_COLUMN_ID.minOrder)).getByText(LARGE_AMOUNT)).toHaveClass("truncate", "min-w-0")
  })

  it("cuts a long usage count short and shows it in full on hover", async () => {
    renderColumns({ usageCount: 123_456, usageLimit: 1_000_000 })
    const usage = within(cell(ADMIN_DISCOUNT_TABLE_COLUMN_ID.usage)).getByText(LONG_USAGE)

    expect(usage).toHaveClass("truncate", "min-w-0", "tabular-nums")

    await userEvent.hover(markAsCut(usage))

    expect(await screen.findByText(LONG_USAGE, { selector: "[data-slot='tooltip-content']" })).toBeInTheDocument()
  })
})

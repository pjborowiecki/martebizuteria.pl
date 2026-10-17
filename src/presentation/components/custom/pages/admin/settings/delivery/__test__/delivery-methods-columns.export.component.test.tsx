import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"

import {
  INPOST,
  LOCKER,
  PICKUP,
  deliveryMethod,
} from "~/src/presentation/components/custom/pages/admin/settings/delivery/__test__/delivery-fixtures"

vi.mock("~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-method-reorder-cell", () => ({
  DeliveryMethodReorderCell: (): JSX.Element => <span />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-methods-row-actions", () => ({
  DeliveryMethodsRowActions: (): JSX.Element => <span />,
}))

const { useDeliveryMethodColumns } =
  await import("~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-methods-columns")

afterEach(cleanup)

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const exportValues = (method: DeliveryMethod["adminMethod"]): Record<string, string | undefined> => {
  const { result } = renderHook(() => useDeliveryMethodColumns(), { wrapper: Wrapper })

  return Object.fromEntries(
    result.current.flatMap((column): [string, string | undefined][] =>
      column.id === undefined ? [] : [[column.id, column.meta?.exportValue?.(method)]],
    ),
  )
}

describe("useDeliveryMethodColumns export values", () => {
  it("exports every data column as the text its cell shows", () => {
    expect(exportValues(LOCKER)).toStrictEqual({
      actions: undefined,
      carrier: "InPost",
      drag: undefined,
      editedAt: "Oct 16, 2026",
      name: "InPost parcel locker",
      "name-en-US": "InPost parcel locker",
      "name-pl-PL": "Paczkomat InPost",
      price: "PLN\u00A014.99",
      status: "Hidden",
      type: "Parcel locker",
    })
  })

  it("exports a free archived method and a method whose carrier is off by their labels", () => {
    expect(exportValues(PICKUP)).toMatchObject({ price: "Free", status: "Archived" })
    expect(exportValues(deliveryMethod({ courier: { ...INPOST, isActive: false } }))).toMatchObject({ status: "Carrier switched off" })
  })
})

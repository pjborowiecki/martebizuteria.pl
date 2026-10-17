import { type JSX, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

export const INPOST = { id: "019f4a10-0000-7000-8000-000000000001", internalCode: "inpost", isActive: true, name: "InPost" }

export const ATELIER = { id: "019f4a10-0000-7000-8000-000000000002", internalCode: "marte-atelier", isActive: true, name: "M'ARTE Atelier" }

export const UPDATED_AT = new Date("2026-10-16T12:00:00.000Z")

export const deliveryMethod = (overrides: Partial<DeliveryMethod["adminMethod"]>): DeliveryMethod["adminMethod"] => ({
  archivedAt: undefined,
  courier: INPOST,
  id: "019f4a10-0001-7000-8000-000000000002",
  isActive: true,
  names: { "en-US": "InPost courier", "pl-PL": "Kurier InPost" },
  price: 1999,
  type: "courier",
  updatedAt: UPDATED_AT,
  ...overrides,
})

export const COURIER = deliveryMethod({})

export const LOCKER = deliveryMethod({
  id: "019f4a10-0001-7000-8000-000000000001",
  isActive: false,
  names: { "en-US": "InPost parcel locker", "pl-PL": "Paczkomat InPost" },
  price: 1499,
  type: "locker",
})

export const PICKUP = deliveryMethod({
  archivedAt: new Date("2026-10-01T00:00:00.000Z"),
  courier: ATELIER,
  id: "019f4a10-0001-7000-8000-000000000003",
  names: { "en-US": "Pickup at the atelier", "pl-PL": "Odbiór w atelier" },
  price: 0,
  type: "in_store",
})

export const renderDelivery = (
  ui: JSX.Element,
  {
    methods = [COURIER, LOCKER, PICKUP],
    threshold,
  }: Readonly<{ methods?: readonly DeliveryMethod["adminMethod"][]; threshold?: number }> = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  })
  queryClient.setQueryData(DELIVERY_METHOD_QUERY_KEYS.ADMIN.ALL, { couriers: [ATELIER, INPOST], methods })
  queryClient.setQueryData(STORE_SETTING_QUERY_KEYS.ADMIN.FREE_DELIVERY, { threshold })

  return renderWithProviders(<Suspense fallback={<p>loading</p>}>{ui}</Suspense>, { queryClient })
}

export const user = () => userEvent.setup({ delay: null })

export const methodRow = (name: string): HTMLElement => {
  const row = screen.getByText(name).closest("tr")
  if (row === null) {
    throw new Error(`no row for ${name}`)
  }

  return row
}

export const bodyRows = (): HTMLElement[] => screen.getAllByRole("row").filter((row) => row.closest("tbody") !== null)

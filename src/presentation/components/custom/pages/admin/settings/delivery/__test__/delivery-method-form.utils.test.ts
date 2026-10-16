import { describe, expect, it } from "vite-plus/test"

import {
  NEW_COURIER,
  toCreateDeliveryMethodInput,
  toDeliveryMethodFormState,
  toUpdateDeliveryMethodInput,
} from "~/src/presentation/components/custom/pages/admin/settings/delivery/delivery-method-form.utils"

const INPOST = { id: "019f4a10-0000-7000-8000-000000000001", internalCode: "inpost", isActive: true, name: "InPost" }

const ATELIER = { id: "019f4a10-0000-7000-8000-000000000002", internalCode: "marte-atelier", isActive: true, name: "Atelier" }

const COURIERS = [ATELIER, INPOST]

const NAMES = { "en-US": "InPost courier", "pl-PL": "Kurier InPost" }

const METHOD = {
  archivedAt: undefined,
  courier: INPOST,
  id: "019f4a10-0001-7000-8000-000000000002",
  isActive: true,
  names: NAMES,
  price: 1999,
  type: "courier" as const,
  updatedAt: new Date("2026-10-16T12:00:00.000Z"),
}

describe("toDeliveryMethodFormState", () => {
  it("starts a new method as an offered InPost courier with no name or price", () => {
    expect(toDeliveryMethodFormState(undefined, COURIERS)).toStrictEqual({
      courierId: INPOST.id,
      courierName: "",
      isActive: true,
      names: { "en-US": "", "pl-PL": "" },
      price: undefined,
      type: "courier",
    })
  })

  it("starts with a new carrier in a shop that has none", () => {
    expect(toDeliveryMethodFormState(undefined, []).courierId).toBe(NEW_COURIER)
  })

  it("fills the form with the method being edited", () => {
    expect(toDeliveryMethodFormState(METHOD, COURIERS)).toMatchObject({ courierId: INPOST.id, isActive: true, names: NAMES, price: 1999 })
  })
})

describe("toCreateDeliveryMethodInput", () => {
  const filled = { ...toDeliveryMethodFormState(undefined, COURIERS), names: NAMES, price: 1999 }

  it("builds the input for an existing carrier", () => {
    expect(toCreateDeliveryMethodInput(filled, COURIERS)).toStrictEqual({
      input: { courier: { id: INPOST.id }, isActive: true, names: NAMES, price: 1999, type: "courier" },
    })
  })

  it("names a new carrier", () => {
    expect(toCreateDeliveryMethodInput({ ...filled, courierId: NEW_COURIER, courierName: " DPD " }, COURIERS)).toMatchObject({
      input: { courier: { name: "DPD" } },
    })
  })

  it("books every parcel locker method with InPost, whichever carrier was picked", () => {
    expect(toCreateDeliveryMethodInput({ ...filled, courierId: ATELIER.id, type: "locker" }, COURIERS)).toMatchObject({
      input: { courier: { id: INPOST.id }, type: "locker" },
    })
  })

  it("keeps the carrier picked for a parcel locker method in a shop without InPost", () => {
    expect(toCreateDeliveryMethodInput({ ...filled, courierId: ATELIER.id, type: "locker" }, [ATELIER])).toMatchObject({
      input: { courier: { id: ATELIER.id } },
    })
  })

  it("points each problem at its field", () => {
    expect(
      toCreateDeliveryMethodInput(
        { ...filled, courierId: NEW_COURIER, courierName: "", names: { "en-US": "x".repeat(81), "pl-PL": " " }, price: undefined },
        COURIERS,
      ),
    ).toStrictEqual({
      errors: { "courier.name": "courierNameRequired", "names.en-US": "nameTooLong", "names.pl-PL": "nameRequired", price: "priceInvalid" },
    })
  })
})

describe("toUpdateDeliveryMethodInput", () => {
  it("sends the edit with the version the admin opened", () => {
    expect(toUpdateDeliveryMethodInput({ ...toDeliveryMethodFormState(METHOD, COURIERS), price: 0 }, METHOD)).toStrictEqual({
      input: { expectedUpdatedAt: METHOD.updatedAt, id: METHOD.id, isActive: true, names: NAMES, price: 0 },
    })
  })

  it("refuses a price that is not a whole number of grosze", () => {
    expect(toUpdateDeliveryMethodInput({ ...toDeliveryMethodFormState(METHOD, COURIERS), price: 10.5 }, METHOD)).toStrictEqual({
      errors: { price: "priceInvalid" },
    })
  })
})

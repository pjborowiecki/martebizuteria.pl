import { describe, expect, it } from "vite-plus/test"

import { inpostApiResponseSchema, inpostPointSchema } from "~/src/integrations/inpost/inpost.zod"

const point = {
  address_details: {
    building_number: "12A",
    city: "Warszawa",
    flat_number: "4",
    post_code: "00-001",
    province: "mazowieckie",
    street: "Krucza",
  },
  location: { latitude: 52.23, longitude: 21.01 },
  location_description: "Obok wejścia",
  location_type: "indoor",
  name: "WAW01A",
  opening_hours: "24/7",
  payment_available: true,
  status: "Operating",
}

describe("inpostPointSchema", () => {
  it("keeps the fields a locker picker needs", () => {
    const parsed = inpostPointSchema.parse(point)

    expect(parsed.name).toBe("WAW01A")
    expect(parsed.location).toStrictEqual({ latitude: 52.23, longitude: 21.01 })
    expect(parsed.address_details.street).toBe("Krucza")
  })

  it.each([[null], [undefined]])("turns a %j location description into an empty string", (locationDescription) => {
    expect(inpostPointSchema.parse({ ...point, location_description: locationDescription }).location_description).toBe("")
  })

  it("parses a point stripped down to its required fields", () => {
    const parsed = inpostPointSchema.parse({
      address_details: { building_number: null, city: "Kraków", post_code: "30-001", province: "małopolskie", street: "Floriańska" },
      location: { latitude: 50.06, longitude: 19.94 },
      name: "KRA01M",
    })

    expect(parsed.address_details.building_number).toBeNull()
    expect(parsed.location_description).toBe("")
    expect(parsed.payment_available).toBeUndefined()
  })

  it("rejects a point without coordinates", () => {
    expect(inpostPointSchema.safeParse({ ...point, location: { latitude: "52.23", longitude: 21.01 } }).success).toBe(false)
  })

  it("rejects a point whose city is missing", () => {
    const { city: _city, ...addressWithoutCity } = point.address_details

    expect(inpostPointSchema.safeParse({ ...point, address_details: addressWithoutCity }).success).toBe(false)
  })

  it("rejects a point without a name", () => {
    const { name: _name, ...pointWithoutName } = point

    expect(inpostPointSchema.safeParse(pointWithoutName).success).toBe(false)
  })
})

describe("inpostApiResponseSchema", () => {
  it("parses a page of points", () => {
    const parsed = inpostApiResponseSchema.parse({ count: 1, items: [point] })

    expect(parsed.count).toBe(1)
    expect(parsed.items).toHaveLength(1)
  })

  it("parses an empty page", () => {
    expect(inpostApiResponseSchema.parse({ count: 0, items: [] }).items).toStrictEqual([])
  })

  it("rejects a response whose count is a string", () => {
    expect(inpostApiResponseSchema.safeParse({ count: "1", items: [point] }).success).toBe(false)
  })

  it("rejects a response with a malformed point", () => {
    expect(inpostApiResponseSchema.safeParse({ count: 1, items: [{ name: "WAW01A" }] }).success).toBe(false)
  })
})

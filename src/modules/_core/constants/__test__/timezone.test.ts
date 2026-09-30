import { describe, expect, it } from "vite-plus/test"

import { COUNTRIES } from "~/src/modules/_core/constants/country"
import { DEFAULT_TIMEZONE_CODE, TIMEZONES } from "~/src/modules/_core/constants/timezone"

const countryCodes = new Set(COUNTRIES.map((country) => country.alpha2))

describe("TIMEZONES", () => {
  it("gives every zone a unique IANA name", () => {
    const names = TIMEZONES.map((zone) => zone.iana)

    expect(new Set(names).size).toBe(names.length)
  })

  it("names zones the runtime can resolve", () => {
    for (const zone of TIMEZONES) {
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone: zone.iana })).not.toThrow()
    }
  })

  it("references only countries the country table knows", () => {
    for (const zone of TIMEZONES) {
      if (zone.country !== undefined) {
        expect(countryCodes).toContain(zone.country)
      }
    }
  })

  it("keeps coordinates inside the geographic range", () => {
    for (const zone of TIMEZONES) {
      expect(zone.latitude).toBeGreaterThanOrEqual(-90)
      expect(zone.latitude).toBeLessThanOrEqual(90)
      expect(zone.longitude).toBeGreaterThanOrEqual(-180)
      expect(zone.longitude).toBeLessThanOrEqual(180)
    }
  })

  it("leaves UTC without a country", () => {
    const utc = TIMEZONES.find((zone) => zone.iana === "UTC")

    expect(utc).toStrictEqual({ country: undefined, iana: "UTC", latitude: 0, longitude: 0 })
  })
})

describe("DEFAULT_TIMEZONE_CODE", () => {
  it("is one of the listed zones", () => {
    expect(TIMEZONES.map((zone) => zone.iana)).toContain(DEFAULT_TIMEZONE_CODE)
  })

  it("is the store home zone", () => {
    expect(DEFAULT_TIMEZONE_CODE).toBe("Europe/Warsaw")
  })
})

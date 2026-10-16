import { describe, expect, it } from "vite-plus/test"

import { formatCountryName } from "~/src/modules/_core/utils/country-name"

describe("formatCountryName", () => {
  it("names a country in the reader's language", () => {
    expect(formatCountryName("PL", "pl-PL")).toBe("Polska")
    expect(formatCountryName("PL", "en-US")).toBe("Poland")
  })

  it("keeps a code it cannot name as it is", () => {
    expect(formatCountryName("XX", "en-US")).toBe("XX")
    expect(formatCountryName("not-a-region", "en-US")).toBe("not-a-region")
  })
})

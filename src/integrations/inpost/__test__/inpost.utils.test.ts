import { describe, expect, it } from "vite-plus/test"

import { SHIPX_TRACKING_NUMBER } from "~/src/integrations/inpost/__test__/fixtures/shipx"
import { inpostTrackingUrl } from "~/src/integrations/inpost/inpost.utils"

describe("inpostTrackingUrl", () => {
  it("links the tracking number to InPost's public tracking page", () => {
    expect(inpostTrackingUrl(SHIPX_TRACKING_NUMBER)).toBe(`https://inpost.pl/sledzenie-przesylek?number=${SHIPX_TRACKING_NUMBER}`)
  })

  it("escapes a number typed with characters a query cannot carry", () => {
    expect(inpostTrackingUrl("A B&1")).toBe("https://inpost.pl/sledzenie-przesylek?number=A%20B%261")
  })
})

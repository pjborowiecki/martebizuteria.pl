import { describe, expect, it } from "vite-plus/test"

import { resolveRequestIp } from "~/src/lib/request"

describe("resolveRequestIp", () => {
  it("prefers the Cloudflare header over a spoofable forwarded chain", () => {
    const headers = new Headers({ "cf-connecting-ip": "203.0.113.5", "x-forwarded-for": "10.0.0.1" })

    expect(resolveRequestIp(headers)).toBe("203.0.113.5")
  })

  it("takes the left-most hop from the forwarded chain", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" })

    expect(resolveRequestIp(headers)).toBe("203.0.113.5")
  })

  it("trims whitespace around the forwarded hop", () => {
    expect(resolveRequestIp(new Headers({ "x-forwarded-for": "  203.0.113.5  " }))).toBe("203.0.113.5")
  })

  it("ignores an empty Cloudflare header and falls through", () => {
    const headers = new Headers({ "cf-connecting-ip": "", "x-forwarded-for": "203.0.113.5" })

    expect(resolveRequestIp(headers)).toBe("203.0.113.5")
  })

  it("reports no address when neither header carries one", () => {
    expect(resolveRequestIp(new Headers())).toBeUndefined()
    expect(resolveRequestIp(new Headers({ "x-forwarded-for": "" }))).toBeUndefined()
  })

  it("reports no address when the forwarded chain holds only separators", () => {
    expect(resolveRequestIp(new Headers({ "x-forwarded-for": " , 70.41.3.18" }))).toBeUndefined()
  })
})

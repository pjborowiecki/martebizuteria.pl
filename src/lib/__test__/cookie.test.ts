import { describe, expect, it } from "vite-plus/test"

import { readCookie, serializeCookie } from "~/src/lib/cookie"

describe("readCookie", () => {
  it.each([[null], [undefined], [""]])("reads nothing from the header %j", (header) => {
    expect(readCookie({ header, name: "marte_locale" })).toBeUndefined()
  })

  it("reads a single cookie", () => {
    expect(readCookie({ header: "marte_locale=en-US", name: "marte_locale" })).toBe("en-US")
  })

  it("reads a cookie from the middle of the header and tolerates spacing", () => {
    expect(readCookie({ header: "a=1; marte_locale=en-US ; b=2", name: "marte_locale" })).toBe("en-US")
  })

  it("does not match a cookie whose name merely ends with the requested one", () => {
    expect(readCookie({ header: "not_marte_locale=pl-PL", name: "marte_locale" })).toBeUndefined()
  })

  it("percent-decodes the value", () => {
    expect(readCookie({ header: "note=hello%20world", name: "note" })).toBe("hello world")
  })

  it("reports nothing rather than throwing on a malformed escape", () => {
    expect(readCookie({ header: "note=%E0%A4%A", name: "note" })).toBeUndefined()
  })

  it("reads an empty value as an empty string", () => {
    expect(readCookie({ header: "marte_locale=", name: "marte_locale" })).toBe("")
  })

  it("ignores an entry with no name before the separator", () => {
    expect(readCookie({ header: "=orphan; marte_locale=en-US", name: "marte_locale" })).toBe("en-US")
  })

  it("returns the first match when the header repeats a name", () => {
    expect(readCookie({ header: "marte_locale=pl-PL; marte_locale=en-US", name: "marte_locale" })).toBe("pl-PL")
  })
})

describe("serializeCookie", () => {
  it("writes a year-long site-wide lax cookie by default", () => {
    const serialized = serializeCookie({ name: "marte_locale", value: "en-US" })

    expect(serialized).toContain("marte_locale=en-US")
    expect(serialized).toContain("Path=/")
    expect(serialized).toContain("Max-Age=31536000")
    expect(serialized).toContain("SameSite=Lax")
  })

  it("percent-encodes the value so it survives the header", () => {
    expect(serializeCookie({ name: "note", value: "hello world" })).toContain("note=hello%20world")
  })

  it("round trips through the reader", () => {
    const serialized = serializeCookie({ name: "note", value: "hello; world" })

    expect(readCookie({ header: serialized, name: "note" })).toBe("hello; world")
  })

  it("honours explicit path, max age and same-site options", () => {
    const serialized = serializeCookie({
      name: "session",
      options: { maxAge: 60, path: "/admin", sameSite: "Strict" },
      value: "1",
    })

    expect(serialized).toContain("Path=/admin")
    expect(serialized).toContain("Max-Age=60")
    expect(serialized).toContain("SameSite=Strict")
  })

  it("always marks a cross-site cookie secure", () => {
    expect(serializeCookie({ name: "session", options: { sameSite: "None" }, value: "1" })).toContain("Secure")
  })

  it("omits Secure when the caller opts out", () => {
    expect(serializeCookie({ name: "session", options: { secure: false }, value: "1" })).not.toContain("Secure")
  })

  it("adds HttpOnly only when asked", () => {
    expect(serializeCookie({ name: "session", options: { httpOnly: true }, value: "1" })).toContain("HttpOnly")
    expect(serializeCookie({ name: "session", value: "1" })).not.toContain("HttpOnly")
  })
})

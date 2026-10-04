import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

import { resolveDeploymentOrigin, resolveRequestIp, resolveRequestOrigin } from "~/src/lib/request"

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

const refuses = (url: string): void => {
  expect(() => resolveRequestOrigin(new Request(url))).toThrow(ERROR_CODES.FORBIDDEN)
}

describe("resolveRequestOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(["http://localhost:3000", "http://127.0.0.1:3000", "https://127.0.0.1:3000"])(
    "keeps a local request on the address it came in on: %s",
    (origin) => {
      expect(resolveRequestOrigin(new Request(`${origin}/_serverFn/subscribe?unrelated=value`))).toBe(origin)
    },
  )

  it("keeps 127.0.0.1 and localhost apart, because they can reach different local servers", () => {
    expect(resolveRequestOrigin(new Request("http://127.0.0.1:3000/"))).not.toBe(
      resolveRequestOrigin(new Request("http://localhost:3000/")),
    )
  })

  it("reads only the request address and ignores host, origin, referer and forwarding headers", () => {
    const request = new Request("http://127.0.0.1:3000/_serverFn/subscribe", {
      headers: {
        host: "attacker.example",
        origin: "https://attacker.example",
        referer: "https://attacker.example/cart",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https",
      },
    })

    expect(resolveRequestOrigin(request)).toBe("http://127.0.0.1:3000")
  })

  it.each([
    "http://localhost:3001",
    "http://[::1]:3000",
    "https://martebizuteria.pl",
    "https://preview.martebizuteria.pl",
    "http://127.0.0.1.attacker.example:3000",
    "ftp://localhost:3000",
  ])("refuses a local build reached on an address it does not serve: %s", refuses)

  it.each(["https://martebizuteria.pl", "https://martebizuteria.pjborowiecki.workers.dev"])(
    "accepts the production deployment on %s",
    (origin) => {
      vi.stubEnv("MODE", "production")

      expect(resolveRequestOrigin(new Request(`${origin}/_serverFn/subscribe`))).toBe(origin)
    },
  )

  it.each([
    "http://martebizuteria.pl",
    "http://localhost:3000",
    "https://preview.martebizuteria.pl",
    "https://martebizuteria.pl.attacker.example",
    "https://fakemartebizuteria.pl",
    "https://other.pjborowiecki.workers.dev",
  ])("refuses a production request on %s", (origin) => {
    vi.stubEnv("MODE", "production")

    refuses(origin)
  })

  it.each(["https://preview.martebizuteria.pl", "https://martebizuteria-preview.pjborowiecki.workers.dev"])(
    "accepts the preview deployment on %s",
    (origin) => {
      vi.stubEnv("MODE", "preview")

      expect(resolveRequestOrigin(new Request(`${origin}/api/webhooks/stripe`))).toBe(origin)
    },
  )

  it.each(["https://martebizuteria.pl", "https://martebizuteria.pjborowiecki.workers.dev", "http://localhost:3000"])(
    "refuses a preview request on %s",
    (origin) => {
      vi.stubEnv("MODE", "preview")

      refuses(origin)
    },
  )
})

describe("resolveDeploymentOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000",
    "https://preview.martebizuteria.pl",
    "https://martebizuteria-preview.pjborowiecki.workers.dev",
    "https://martebizuteria.pl",
    "https://martebizuteria.pjborowiecki.workers.dev",
  ])("keeps an address written by any deployment: %s", (origin) => {
    expect(resolveDeploymentOrigin(`${origin}/en-US/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`)).toBe(origin)
  })

  it.each(["preview", "production"])("accepts a local checkout address on the %s deployment", (mode) => {
    vi.stubEnv("MODE", mode)

    expect(resolveDeploymentOrigin("http://127.0.0.1:3000/checkout")).toBe("http://127.0.0.1:3000")
  })

  it.each([
    "http://martebizuteria.pl/checkout",
    "http://preview.martebizuteria.pl/checkout",
    "https://martebizuteria.pl.attacker.example/checkout",
    "https://fakemartebizuteria.pl/checkout",
    "https://other.pjborowiecki.workers.dev/checkout",
    "http://localhost:3001/checkout",
    "http://[::1]:3000/checkout",
    "ftp://localhost:3000/checkout",
  ])("refuses an address no deployment serves: %s", (url) => {
    expect(() => resolveDeploymentOrigin(url)).toThrow(ERROR_CODES.FORBIDDEN)
  })
})

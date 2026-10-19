import { describe, expect, it } from "vite-plus/test"

import { parseUserAgent } from "~/src/modules/session/session.utils"

describe("parseUserAgent", () => {
  it.each([[null], [""]])("reports an unknown device for %j", (userAgent) => {
    expect(parseUserAgent(userAgent)).toStrictEqual({ browser: "Unknown browser", device: "Unknown device", deviceType: "unknown" })
  })

  it.each([
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      { browser: "Chrome", device: "Mac", deviceType: "desktop" },
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      { browser: "Safari", device: "iPhone", deviceType: "mobile" },
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      { browser: "Chrome", device: "Android", deviceType: "mobile" },
    ],
    [
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/604.1",
      { browser: "Safari", device: "iPad", deviceType: "tablet" },
    ],
    [
      "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      { browser: "Chrome", device: "Android", deviceType: "tablet" },
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
      { browser: "Edge", device: "Windows", deviceType: "desktop" },
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
      { browser: "Firefox", device: "Windows", deviceType: "desktop" },
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.0.0 Mobile/15E148 Safari/604.1",
      { browser: "Chrome", device: "iPhone", deviceType: "mobile" },
    ],
  ])("names the device and browser behind a real user agent", (userAgent, expected) => {
    expect(parseUserAgent(userAgent)).toStrictEqual(expected)
  })

  it("prefers Edge over the Chrome its agent also claims", () => {
    expect(parseUserAgent("Windows NT 10.0 Chrome/124 Safari/537.36 Edg/124").browser).toBe("Edge")
  })

  it("prefers Chrome over the Safari its agent also claims", () => {
    expect(parseUserAgent("Macintosh Chrome/124 Safari/537.36").browser).toBe("Chrome")
  })

  it("falls back to generic labels for an agent it does not recognise", () => {
    expect(parseUserAgent("curl/8.0")).toStrictEqual({ browser: "Browser", device: "Device", deviceType: "desktop" })
  })
})

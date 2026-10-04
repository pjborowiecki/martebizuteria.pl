import { describe, expect, it } from "vite-plus/test"

import { HTTP_STATUS, appHostsForMode, isDeploymentHost, isLocalHost, isLocalMode } from "~/src/modules/_core/constants/api"

import { APP_DOMAIN } from "~/src/presentation/branding/app"

describe("HTTP_STATUS", () => {
  it("holds only integer status codes inside the HTTP range", () => {
    for (const status of Object.values(HTTP_STATUS)) {
      expect(Number.isInteger(status)).toBe(true)
      expect(status).toBeGreaterThanOrEqual(100)
      expect(status).toBeLessThan(600)
    }
  })

  it("gives every name its own code", () => {
    const codes = Object.values(HTTP_STATUS)

    expect(new Set(codes).size).toBe(codes.length)
  })

  it("keeps the websocket upgrade handshake pair", () => {
    expect(HTTP_STATUS.SWITCHING_PROTOCOLS).toBe(101)
    expect(HTTP_STATUS.UPGRADE_REQUIRED).toBe(426)
  })

  it("keeps the client and server error codes used by the API layer", () => {
    expect(HTTP_STATUS.BAD_REQUEST).toBe(400)
    expect(HTTP_STATUS.UNAUTHORIZED).toBe(401)
    expect(HTTP_STATUS.FORBIDDEN).toBe(403)
    expect(HTTP_STATUS.NOT_FOUND).toBe(404)
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500)
  })
})

describe("application environments", () => {
  it.each(["development", "test"])("recognizes %s as local", (mode) => {
    expect(isLocalMode(mode)).toBe(true)
    expect(appHostsForMode(mode)).toStrictEqual(["localhost:3000", "127.0.0.1:3000"])
  })

  it.each(["preview", "production", "staging", ""])("does not classify %s as local", (mode) => {
    expect(isLocalMode(mode)).toBe(false)
  })

  it("keeps preview hosts separate from production", () => {
    expect(appHostsForMode("preview")).toStrictEqual([`preview.${APP_DOMAIN}`, "martebizuteria-preview.pjborowiecki.workers.dev"])
    expect(appHostsForMode("production")).toStrictEqual([APP_DOMAIN, "martebizuteria.pjborowiecki.workers.dev"])
  })

  it("falls back to local hosts for an unconfigured mode", () => {
    expect(appHostsForMode("staging")).toStrictEqual(["localhost:3000", "127.0.0.1:3000"])
  })

  it.each(["preview", "production", "development"])("returns an independent host list for %s", (mode) => {
    const original = appHostsForMode(mode)
    const modified = appHostsForMode(mode)
    modified.push("unexpected.example")

    expect(appHostsForMode(mode)).toStrictEqual(original)
    expect(appHostsForMode(mode)).not.toContain("unexpected.example")
  })
})

describe("deployment hosts", () => {
  it.each(["localhost:3000", "127.0.0.1:3000"])("treats %s as local", (host) => {
    expect(isLocalHost(host)).toBe(true)
    expect(isDeploymentHost(host)).toBe(true)
  })

  it.each([
    `preview.${APP_DOMAIN}`,
    "martebizuteria-preview.pjborowiecki.workers.dev",
    APP_DOMAIN,
    "martebizuteria.pjborowiecki.workers.dev",
  ])("treats %s as a deployment that is not local", (host) => {
    expect(isLocalHost(host)).toBe(false)
    expect(isDeploymentHost(host)).toBe(true)
  })

  it.each(["localhost:3001", "[::1]:3000", `${APP_DOMAIN}.attacker.example`, `fake${APP_DOMAIN}`, "other.pjborowiecki.workers.dev", ""])(
    "does not treat %s as any deployment",
    (host) => {
      expect(isLocalHost(host)).toBe(false)
      expect(isDeploymentHost(host)).toBe(false)
    },
  )
})

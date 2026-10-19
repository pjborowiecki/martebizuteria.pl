const BROWSER_PATTERNS = [
  ["Edge", /edg(?:e|a|ios)?\//u],
  ["Opera", /opr\/|opera/u],
  ["Samsung Internet", /samsungbrowser/u],
  ["Chrome", /chrome|crios|chromium/u],
  ["Firefox", /firefox|fxios/u],
  ["Safari", /safari/u],
] as const

const DEVICE_PATTERNS = [
  ["iPhone", /iphone/u],
  ["iPad", /ipad/u],
  ["Android", /android/u],
  ["Mac", /macintosh|mac os x/u],
  ["Windows", /windows/u],
  ["Linux", /linux|cros/u],
] as const

const resolveBrowserName = (agent: string): string => BROWSER_PATTERNS.find(([, pattern]) => pattern.test(agent))?.[0] ?? "Browser"

const resolveDeviceName = (agent: string): string => DEVICE_PATTERNS.find(([, pattern]) => pattern.test(agent))?.[0] ?? "Device"

const resolveDeviceType = (agent: string): "desktop" | "mobile" | "tablet" => {
  if (/ipad|tablet|(?:android(?!.*mobile))/u.test(agent)) {
    return "tablet"
  }

  return /mobile|iphone|android|iemobile/u.test(agent) ? "mobile" : "desktop"
}

export const parseUserAgent = (
  userAgent: string | null = "",
): {
  readonly browser: string
  readonly device: string
  readonly deviceType: "desktop" | "mobile" | "tablet" | "unknown"
} => {
  if (userAgent === null || userAgent === "") {
    return {
      browser: "Unknown browser",
      device: "Unknown device",
      deviceType: "unknown",
    }
  }

  const agent = userAgent.toLowerCase()

  return {
    browser: resolveBrowserName(agent),
    device: resolveDeviceName(agent),
    deviceType: resolveDeviceType(agent),
  }
}

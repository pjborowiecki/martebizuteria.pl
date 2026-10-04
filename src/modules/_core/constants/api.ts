import { APP_DOMAIN } from "~/src/presentation/branding/app"

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404,
  SWITCHING_PROTOCOLS: 101,
  UNAUTHORIZED: 401,
  UPGRADE_REQUIRED: 426,
} as const

const LOCAL_MODES = new Set(["development", "test"])

const HOSTS_BY_MODE: Readonly<Record<string, readonly string[]>> = {
  preview: [`preview.${APP_DOMAIN}`, "martebizuteria-preview.pjborowiecki.workers.dev"],
  production: [APP_DOMAIN, "martebizuteria.pjborowiecki.workers.dev"],
}

const LOCAL_HOSTS = ["localhost:3000", "127.0.0.1:3000"]

export const isLocalMode = (mode: string): boolean => LOCAL_MODES.has(mode)

export const appHostsForMode = (mode: string): string[] => [...(HOSTS_BY_MODE[mode] ?? LOCAL_HOSTS)]

export const isLocalHost = (host: string): boolean => LOCAL_HOSTS.includes(host)

export const isDeploymentHost = (host: string): boolean =>
  isLocalHost(host) || Object.values(HOSTS_BY_MODE).some((hosts) => hosts.includes(host))

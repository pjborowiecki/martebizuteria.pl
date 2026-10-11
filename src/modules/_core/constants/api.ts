import { APP_DOMAIN } from "~/src/presentation/branding/app"

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
  METHOD_NOT_ALLOWED: 405,
  NOT_FOUND: 404,
  OK: 200,
  SERVICE_UNAVAILABLE: 503,
  SWITCHING_PROTOCOLS: 101,
  TOO_MANY_REQUESTS: 429,
  UNAUTHORIZED: 401,
  UPGRADE_REQUIRED: 426,
} as const

const LOCAL_MODES = new Set(["development", "test"])

export const WORKERS_DEV_HOSTS = {
  preview: "martebizuteria-preview.pjborowiecki.workers.dev",
  production: "martebizuteria.pjborowiecki.workers.dev",
} as const

const HOSTS_BY_MODE: Readonly<Record<string, readonly string[]>> = {
  preview: [`preview.${APP_DOMAIN}`, WORKERS_DEV_HOSTS.preview],
  production: [APP_DOMAIN, WORKERS_DEV_HOSTS.production],
}

const LOCAL_HOSTS = ["localhost:3000", "127.0.0.1:3000"]

export const isLocalMode = (mode: string): boolean => LOCAL_MODES.has(mode)

export const appHostsForMode = (mode: string): string[] => [...(HOSTS_BY_MODE[mode] ?? LOCAL_HOSTS)]

export const isLocalHost = (host: string): boolean => LOCAL_HOSTS.includes(host)

export const isDeploymentHost = (host: string): boolean =>
  isLocalHost(host) || Object.values(HOSTS_BY_MODE).some((hosts) => hosts.includes(host))

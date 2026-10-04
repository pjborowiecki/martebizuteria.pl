import "@tanstack/react-start/server-only"

import { appHostsForMode, isDeploymentHost, isLocalHost } from "~/src/modules/_core/constants/api"
import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

export const resolveRequestIp = (headers: Headers): string | undefined => {
  const connectingIp = headers.get("cf-connecting-ip")
  if (connectingIp !== null && connectingIp !== "") {
    return connectingIp
  }

  const forwarded = headers.get("x-forwarded-for")
  if (forwarded === null || forwarded === "") {
    return undefined
  }

  const [first] = forwarded.split(",")
  const trimmed = first?.trim()

  return trimmed === "" ? undefined : trimmed
}

const originOnAcceptedHost = (url: string, isAcceptedHost: (host: string) => boolean): string => {
  const { host, origin, protocol } = new URL(url)
  const isSecureEnough = protocol === "https:" || (protocol === "http:" && isLocalHost(host))

  if (!isAcceptedHost(host) || !isSecureEnough) {
    throw new AppError(ERROR_CODES.FORBIDDEN)
  }

  return origin
}

export const resolveRequestOrigin = (request: Request): string =>
  originOnAcceptedHost(request.url, (host) => appHostsForMode(import.meta.env.MODE).includes(host))

export const resolveDeploymentOrigin = (url: string): string => originOnAcceptedHost(url, isDeploymentHost)

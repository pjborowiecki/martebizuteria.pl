import { INPOST_POINTS_API_ORIGIN } from "~/src/integrations/inpost/inpost.constants"
import { type InpostPointParsed, inpostApiResponseSchema, inpostPointSchema } from "~/src/integrations/inpost/inpost.zod"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

const capitalizeCity = (city: string): string => city.toLowerCase().replaceAll(/(?:^\p{L}|[\s-]\p{L})/gu, (char) => char.toUpperCase())

export const fetchPointsByCity = async (city: string): Promise<InpostPointParsed[]> => {
  const trimmed = city.trim()
  if (trimmed.length < MIN_CITY_LENGTH) {
    return []
  }

  const url = `${INPOST_API_BASE}?city=${encodeURIComponent(capitalizeCity(trimmed))}&per_page=1000`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`InPost API error: ${String(response.status)}`)
  }

  const raw: unknown = await response.json()
  const parsed = inpostApiResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return []
  }

  return parsed.data.items
}

export const fetchPointByName = async (name: string): Promise<InpostPointParsed | undefined> => {
  const response = await fetch(`${INPOST_API_BASE}/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(POINT_LOOKUP_TIMEOUT_MS) })
  if (response.status === HTTP_STATUS.NOT_FOUND) {
    return undefined
  }

  if (!response.ok) {
    throw new Error(`InPost API error: ${String(response.status)}`)
  }

  return inpostPointSchema.parse(await response.json())
}

const INPOST_API_BASE = `${INPOST_POINTS_API_ORIGIN}/v1/points`

const MIN_CITY_LENGTH = 3

const POINT_LOOKUP_TIMEOUT_MS = 3000

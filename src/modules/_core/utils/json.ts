import zod from "zod/v4"

const jsonRecordSchema = zod.record(zod.string(), zod.unknown())

export const tryParseJsonRecord = (raw: string | null | undefined): Record<string, unknown> | undefined => {
  if (raw === null || raw === undefined || raw.trim() === "") {
    return undefined
  }

  try {
    return jsonRecordSchema.safeParse(JSON.parse(raw)).data
  } catch {
    return undefined
  }
}

export const parseJsonRecord = (raw: string | null | undefined): Record<string, unknown> => tryParseJsonRecord(raw) ?? {}

export const readJsonNumber = (record: Record<string, unknown>, key: string, fallback: number): number => {
  const value = record[key]

  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

export const readJsonString = (record: Record<string, unknown>, key: string, fallback: string): string => {
  const value = record[key]

  return typeof value === "string" && value.trim() !== "" ? value : fallback
}

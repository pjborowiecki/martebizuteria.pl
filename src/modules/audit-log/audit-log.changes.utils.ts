import { type z } from "zod/v4"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import { auditLogZodSchemas } from "~/src/modules/audit-log/audit-log.zod"

type VariantSnapshot = z.infer<(typeof auditLogZodSchemas)["variantSnapshots"]>[number]

const VARIANT_KEY_SEPARATOR = "\u0000"

const formatReadableValue = (value: unknown, nested: boolean): string => {
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return String(value)
  }

  if (typeof value !== "object" || value === null) {
    return EMPTY_VALUE
  }

  const parts = Array.isArray(value)
    ? value.map((item: unknown) => formatReadableValue(item, true))
    : Object.entries(value).map(([key, item]) => `${key}: ${formatReadableValue(item, true)}`)
  const text = parts.join(", ")

  return nested ? `(${text})` : text
}

const toChangeValue = (value: unknown): AuditLog["detailValue"]["value"] | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  return typeof value === "number" || typeof value === "string" ? value : formatReadableValue(value, false)
}

const keyVariantsBySku = (variants: readonly VariantSnapshot[]): ReadonlyMap<string, VariantSnapshot> => {
  const occurrences = new Map<string, number>()

  return new Map(
    variants.map((variant) => {
      const occurrence = occurrences.get(variant.sku) ?? 0
      occurrences.set(variant.sku, occurrence + 1)

      return [`${variant.sku}${VARIANT_KEY_SEPARATOR}${String(occurrence)}`, variant] as const
    }),
  )
}

const describeMove = (from: number, to: number): AuditLog["valueMove"] | undefined => (from === to ? undefined : { from, to })

const describeVariantChanges = (before: readonly VariantSnapshot[], after: readonly VariantSnapshot[]): AuditLog["variantChange"][] => {
  const previous = keyVariantsBySku(before)
  const next = keyVariantsBySku(after)
  const keptOrAdded = [...next].flatMap(([key, variant]): AuditLog["variantChange"][] => {
    const prior = previous.get(key)
    if (prior === undefined) {
      return [{ change: "added", sku: variant.sku }]
    }

    const price = describeMove(prior.price, variant.price)
    const quantity = describeMove(prior.quantity, variant.quantity)

    return price === undefined && quantity === undefined ? [] : [{ change: "updated", price, quantity, sku: variant.sku }]
  })
  const removed = [...previous]
    .filter(([key]) => !next.has(key))
    .map(([, variant]): AuditLog["variantChange"] => ({ change: "removed", sku: variant.sku }))

  return [...keptOrAdded, ...removed]
}

const describeVariantsChange = (from: unknown, to: unknown): AuditLog["change"][] | undefined => {
  const before = auditLogZodSchemas.variantSnapshots.safeParse(from).data
  const after = auditLogZodSchemas.variantSnapshots.safeParse(to).data
  if (before === undefined || after === undefined) {
    return undefined
  }

  const variants = describeVariantChanges(before, after)

  return variants.length === 0 ? [] : [{ field: "variants", variants }]
}

const describeChange = (field: string, from: unknown, to: unknown): AuditLog["change"][] =>
  (field === "variants" ? describeVariantsChange(from, to) : undefined) ?? [{ field, from: toChangeValue(from), to: toChangeValue(to) }]

export const describeAuditLogChanges = (metadata: Record<string, unknown> | undefined): AuditLog["change"][] | undefined => {
  const changes = auditLogZodSchemas.changeMetadata.safeParse(metadata).data

  return changes?.changed.flatMap((field) => describeChange(field, changes.old[field], changes.new[field]))
}

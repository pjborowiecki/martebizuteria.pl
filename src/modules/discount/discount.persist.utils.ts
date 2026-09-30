import { type SQL, sql } from "drizzle-orm"

import { type Discount } from "~/src/modules/discount/discount.types"
import { normalizeDiscountCode, resolveDiscountStatus } from "~/src/modules/discount/discount.utils"

const parseOptionalDate = (value: string | undefined): Date | undefined => {
  if (value === undefined || value.trim() === "") {
    return undefined
  }

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const trimmedOrUndefined = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim()

  return trimmed === undefined || trimmed === "" ? undefined : trimmed
}

/**
 * On insert an absent limit is simply omitted, so the column takes its default.
 */
export const toDiscountInsertValues = (values: Discount["adminFormValues"]): Omit<Discount["insert"], "id"> => ({
  code: normalizeDiscountCode(values.code),
  description: trimmedOrUndefined(values.description),
  endsAt: parseOptionalDate(values.endsAt),
  isActive: values.isActive,
  maxDiscountAmount: values.maxDiscountAmount,
  minOrderTotal: values.minOrderTotal,
  perCustomerLimit: values.perCustomerLimit,
  startsAt: parseOptionalDate(values.startsAt),
  type: values.type,
  usageLimit: values.usageLimit,
  value: values.value,
})

/**
 * On update an absent limit has to be cleared explicitly, otherwise editing a
 * code could never remove a restriction it was saved with.
 */
export const toDiscountUpdateValues = (values: Discount["adminFormValues"]): DiscountUpdateValues => ({
  code: normalizeDiscountCode(values.code),
  description: trimmedOrUndefined(values.description) ?? CLEARED,
  endsAt: parseOptionalDate(values.endsAt) ?? CLEARED,
  isActive: values.isActive,
  maxDiscountAmount: values.maxDiscountAmount ?? CLEARED,
  minOrderTotal: values.minOrderTotal ?? CLEARED,
  perCustomerLimit: values.perCustomerLimit ?? CLEARED,
  startsAt: parseOptionalDate(values.startsAt) ?? CLEARED,
  type: values.type,
  updatedAt: new Date(),
  usageLimit: values.usageLimit ?? CLEARED,
  value: values.value,
})

export const toAdminDiscountListItem = (row: Discount["select"], now: Date): Discount["adminListItem"] => ({
  code: row.code,
  description: row.description ?? undefined,
  endsAt: row.endsAt ?? undefined,
  id: row.id,
  isActive: row.isActive,
  maxDiscountAmountMinorUnits: row.maxDiscountAmount ?? undefined,
  minOrderTotalMinorUnits: row.minOrderTotal ?? undefined,
  perCustomerLimit: row.perCustomerLimit ?? undefined,
  startsAt: row.startsAt ?? undefined,
  status: resolveDiscountStatus(row, now),
  type: row.type,
  usageCount: row.usageCount,
  usageLimit: row.usageLimit ?? undefined,
  value: row.value,
})

const CLEARED: SQL = sql`null`

interface DiscountUpdateValues {
  readonly code: string
  readonly description: SQL | string
  readonly endsAt: Date | SQL
  readonly isActive: boolean
  readonly maxDiscountAmount: SQL | number
  readonly minOrderTotal: SQL | number
  readonly perCustomerLimit: SQL | number
  readonly startsAt: Date | SQL
  readonly type: Discount["adminFormValues"]["type"]
  readonly updatedAt: Date
  readonly usageLimit: SQL | number
  readonly value: number
}

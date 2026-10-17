import { type SQL, sql } from "drizzle-orm"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DISCOUNT_ERROR_CODES, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
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

const percentageCap = (values: Discount["adminFormValues"]): number | undefined =>
  values.type === DISCOUNT_TYPE.PERCENTAGE ? values.maxDiscountAmount : undefined

const isTakenDiscountCodeError = (error: unknown): boolean =>
  error instanceof Error && (error.message.includes(DISCOUNT_CODE_UNIQUE_CONSTRAINT) || isTakenDiscountCodeError(error.cause))

export const refuseTakenDiscountCode = (error: unknown): never => {
  if (isTakenDiscountCodeError(error)) {
    throw new AppError(ERROR_CODES.CONFLICT, DISCOUNT_ERROR_CODES.CODE_TAKEN)
  }

  throw error
}

export const toDiscountInsertValues = (values: Discount["adminFormValues"]): Omit<Discount["insert"], "id"> => ({
  code: normalizeDiscountCode(values.code),
  description: trimmedOrUndefined(values.description),
  endsAt: parseOptionalDate(values.endsAt),
  isActive: values.isActive,
  maxDiscountAmount: percentageCap(values),
  minOrderTotal: values.minOrderTotal,
  perCustomerLimit: values.perCustomerLimit,
  startsAt: parseOptionalDate(values.startsAt),
  type: values.type,
  usageLimit: values.usageLimit,
  value: values.value,
})

export const toDiscountUpdateValues = (values: Discount["adminFormValues"]): DiscountUpdateValues => ({
  code: normalizeDiscountCode(values.code),
  description: trimmedOrUndefined(values.description) ?? CLEARED,
  endsAt: parseOptionalDate(values.endsAt) ?? CLEARED,
  isActive: values.isActive,
  maxDiscountAmount: percentageCap(values) ?? CLEARED,
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
  createdAt: row.createdAt,
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

const DISCOUNT_CODE_UNIQUE_CONSTRAINT = "UNIQUE constraint failed: discount.code"

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

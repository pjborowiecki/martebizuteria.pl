import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { INVENTORY_NON_NEGATIVE_AVAILABLE_CHECK } from "~/src/modules/inventory/inventory.constants"
import { PRODUCT_ERROR_CODES } from "~/src/modules/product/product.constants"

const UNIQUE_PRODUCT_HANDLE_CONSTRAINT = "UNIQUE constraint failed: product.handle"

const UNIQUE_PRODUCT_VARIANT_SKU_CONSTRAINT = "UNIQUE constraint failed: product_variant.sku"

const NEGATIVE_AVAILABLE_STOCK_CONSTRAINT = `CHECK constraint failed: ${INVENTORY_NON_NEGATIVE_AVAILABLE_CHECK}`

const collectErrorMessages = (error: unknown): string[] => {
  const messages: string[] = []
  let current: unknown = error
  while (current instanceof Error) {
    if (current.message !== "") {
      messages.push(current.message)
    }
    current = current.cause
  }

  return messages
}

export const isDuplicateHandleMutationError = (error: unknown): boolean =>
  collectErrorMessages(error).some(
    (message) => message === PRODUCT_ERROR_CODES.DUPLICATE_HANDLE || message.includes(UNIQUE_PRODUCT_HANDLE_CONSTRAINT),
  )

export const isDuplicateSkuMutationError = (error: unknown): boolean =>
  collectErrorMessages(error).some(
    (message) => message === PRODUCT_ERROR_CODES.DUPLICATE_SKU || message.includes(UNIQUE_PRODUCT_VARIANT_SKU_CONSTRAINT),
  )

export const isReservedInCheckoutMutationError = (error: unknown): boolean =>
  collectErrorMessages(error).includes(PRODUCT_ERROR_CODES.RESERVED_IN_CHECKOUT)

export const isStockChangedWhileEditingMutationError = (error: unknown): boolean =>
  collectErrorMessages(error).some(
    (message) => message === PRODUCT_ERROR_CODES.STOCK_CHANGED_WHILE_EDITING || message.includes(NEGATIVE_AVAILABLE_STOCK_CONSTRAINT),
  )

export const isDuplicateAttributeOnProductMutationError = (error: unknown): boolean =>
  collectErrorMessages(error).some(
    (message) =>
      message.includes("attribute_on_product_product_attribute_uidx") ||
      message.includes("attribute_on_product.product_id, attribute_on_product.attribute_id"),
  )

export const isDatabaseSchemaOutdatedMutationError = (error: unknown): boolean =>
  collectErrorMessages(error).some(
    (message) => message.includes("no such column") || (message.includes("Failed query") && message.includes('"titles"')),
  )

export const resolveProductMutationErrorMessage = (error: unknown): string => collectErrorMessages(error).at(-1) ?? ""

export const rethrowProductMutationError = (error: unknown): never => {
  if (isDuplicateHandleMutationError(error)) {
    throw new AppError(ERROR_CODES.CONFLICT, PRODUCT_ERROR_CODES.DUPLICATE_HANDLE)
  }

  if (isDuplicateSkuMutationError(error)) {
    throw new AppError(ERROR_CODES.CONFLICT, PRODUCT_ERROR_CODES.DUPLICATE_SKU)
  }

  if (isStockChangedWhileEditingMutationError(error)) {
    throw new AppError(ERROR_CODES.CONFLICT, PRODUCT_ERROR_CODES.STOCK_CHANGED_WHILE_EDITING)
  }

  throw error
}

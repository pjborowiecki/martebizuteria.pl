import { PRODUCT_ERROR_CODES } from "~/src/modules/product/product.constants";

const UNIQUE_PRODUCT_HANDLE_CONSTRAINT = "UNIQUE constraint failed: product.handle";
const UNIQUE_PRODUCT_VARIANT_SKU_CONSTRAINT = "UNIQUE constraint failed: product_variant.sku";

function collectErrorMessages(error: unknown): string[] {
  const messages: string[] = [];
  let current: unknown = error;

  while (current instanceof Error) {
    if (current.message !== "") {
      messages.push(current.message);
    }
    current = current.cause;
  }

  return messages;
}

export function isDuplicateHandleMutationError(error: unknown): boolean {
  return collectErrorMessages(error).some(
    (message) => message === PRODUCT_ERROR_CODES.DUPLICATE_HANDLE || message.includes(UNIQUE_PRODUCT_HANDLE_CONSTRAINT)
  );
}

export function isDuplicateSkuMutationError(error: unknown): boolean {
  return collectErrorMessages(error).some(
    (message) => message === PRODUCT_ERROR_CODES.DUPLICATE_SKU || message.includes(UNIQUE_PRODUCT_VARIANT_SKU_CONSTRAINT)
  );
}

export function isDuplicateAttributeOnProductMutationError(error: unknown): boolean {
  return collectErrorMessages(error).some(
    (message) =>
      message.includes("attribute_on_product_product_attribute_uidx") ||
      message.includes("attribute_on_product.product_id, attribute_on_product.attribute_id")
  );
}

export function isDatabaseSchemaOutdatedMutationError(error: unknown): boolean {
  return collectErrorMessages(error).some(
    (message) => message.includes("no such column") || (message.includes("Failed query") && message.includes('"titles"'))
  );
}

const EMPTY_MESSAGES = 0;
const LAST_MESSAGE_OFFSET = 1;

/** Prefer the deepest underlying message for display in admin toasts. */
export function resolveProductMutationErrorMessage(error: unknown): string {
  const messages = collectErrorMessages(error);
  if (messages.length === EMPTY_MESSAGES) {
    return "";
  }

  return messages[messages.length - LAST_MESSAGE_OFFSET] ?? "";
}

export function rethrowProductMutationError(error: unknown): never {
  if (isDuplicateHandleMutationError(error)) {
    throw new Error(PRODUCT_ERROR_CODES.DUPLICATE_HANDLE, { cause: error });
  }

  if (isDuplicateSkuMutationError(error)) {
    throw new Error(PRODUCT_ERROR_CODES.DUPLICATE_SKU, { cause: error });
  }

  throw error;
}

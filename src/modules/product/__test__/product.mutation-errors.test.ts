import { describe, expect, it } from "vite-plus/test"

import { PRODUCT_ERROR_CODES } from "~/src/modules/product/product.constants"
import {
  isDatabaseSchemaOutdatedMutationError,
  isDuplicateAttributeOnProductMutationError,
  isDuplicateHandleMutationError,
  isDuplicateSkuMutationError,
  resolveProductMutationErrorMessage,
  rethrowProductMutationError,
} from "~/src/modules/product/product.mutation-errors"

const nested = (outer: string, inner: string): Error => new Error(outer, { cause: new Error(inner) })

const BLANK_MESSAGE = ""

describe("isDuplicateHandleMutationError", () => {
  it("recognises the error code the use case already rethrew", () => {
    expect(isDuplicateHandleMutationError(new Error(PRODUCT_ERROR_CODES.DUPLICATE_HANDLE))).toBe(true)
  })

  it("recognises the raw sqlite constraint message", () => {
    expect(isDuplicateHandleMutationError(new Error("D1_ERROR: UNIQUE constraint failed: product.handle: SQLITE_CONSTRAINT"))).toBe(true)
  })

  it("looks through the cause chain of a wrapped driver error", () => {
    expect(isDuplicateHandleMutationError(nested("Failed query: insert into product", "UNIQUE constraint failed: product.handle"))).toBe(
      true,
    )
  })

  it("does not confuse a SKU collision with a handle collision", () => {
    expect(isDuplicateHandleMutationError(new Error("UNIQUE constraint failed: product_variant.sku"))).toBe(false)
  })

  it("ignores a value that is not an error at all", () => {
    expect(isDuplicateHandleMutationError("UNIQUE constraint failed: product.handle")).toBe(false)
    expect(isDuplicateHandleMutationError(undefined)).toBe(false)
  })

  it("treats a partial error code as no match", () => {
    expect(isDuplicateHandleMutationError(new Error("DUPLICATE"))).toBe(false)
  })
})

describe("isDuplicateSkuMutationError", () => {
  it("recognises the error code and the raw constraint alike", () => {
    expect(isDuplicateSkuMutationError(new Error(PRODUCT_ERROR_CODES.DUPLICATE_SKU))).toBe(true)
    expect(isDuplicateSkuMutationError(new Error("UNIQUE constraint failed: product_variant.sku"))).toBe(true)
  })

  it("finds the constraint two causes deep", () => {
    const deep = new Error("outer", { cause: nested("middle", "UNIQUE constraint failed: product_variant.sku") })

    expect(isDuplicateSkuMutationError(deep)).toBe(true)
  })

  it("does not fire on an unrelated unique constraint", () => {
    expect(isDuplicateSkuMutationError(new Error("UNIQUE constraint failed: product.handle"))).toBe(false)
  })
})

describe("isDuplicateAttributeOnProductMutationError", () => {
  it("recognises the named index", () => {
    expect(
      isDuplicateAttributeOnProductMutationError(new Error("UNIQUE constraint failed: attribute_on_product_product_attribute_uidx")),
    ).toBe(true)
  })

  it("recognises the column pair sqlite reports instead of the index name", () => {
    const error = new Error("UNIQUE constraint failed: attribute_on_product.product_id, attribute_on_product.attribute_id")

    expect(isDuplicateAttributeOnProductMutationError(error)).toBe(true)
  })

  it("stays quiet for any other constraint", () => {
    expect(isDuplicateAttributeOnProductMutationError(new Error("UNIQUE constraint failed: product.handle"))).toBe(false)
  })
})

describe("isDatabaseSchemaOutdatedMutationError", () => {
  it("recognises a missing column", () => {
    expect(isDatabaseSchemaOutdatedMutationError(new Error("D1_ERROR: no such column: product.titles"))).toBe(true)
  })

  it("recognises a failed query that mentions the titles column", () => {
    expect(isDatabaseSchemaOutdatedMutationError(new Error('Failed query: select "titles" from "product"'))).toBe(true)
  })

  it("needs both halves of the failed query signal", () => {
    expect(isDatabaseSchemaOutdatedMutationError(new Error("Failed query: select id from product"))).toBe(false)
    expect(isDatabaseSchemaOutdatedMutationError(new Error('select "titles" from "product"'))).toBe(false)
  })
})

describe("resolveProductMutationErrorMessage", () => {
  it("returns the innermost message of a wrapped error", () => {
    expect(resolveProductMutationErrorMessage(nested("wrapper", "the real cause"))).toBe("the real cause")
  })

  it("returns the only message when nothing wrapped it", () => {
    expect(resolveProductMutationErrorMessage(new Error("boom"))).toBe("boom")
  })

  it("skips an empty message on the way down the chain", () => {
    expect(resolveProductMutationErrorMessage(nested("wrapper", ""))).toBe("wrapper")
  })

  it("returns an empty string for a non error value", () => {
    expect(resolveProductMutationErrorMessage({ message: "not an error" })).toBe("")
    expect(resolveProductMutationErrorMessage(new Error(BLANK_MESSAGE))).toBe("")
  })
})

describe("rethrowProductMutationError", () => {
  it("translates a handle collision into the shared error code", () => {
    const driverError = new Error("UNIQUE constraint failed: product.handle")

    expect(() => rethrowProductMutationError(driverError)).toThrow(PRODUCT_ERROR_CODES.DUPLICATE_HANDLE)
  })

  it("keeps the driver error as the cause so the message can still be read", () => {
    const driverError = new Error("UNIQUE constraint failed: product_variant.sku")
    let caught: unknown = null

    try {
      rethrowProductMutationError(driverError)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(Error)
    expect(caught instanceof Error ? caught.message : "").toBe(PRODUCT_ERROR_CODES.DUPLICATE_SKU)
    expect(caught instanceof Error ? caught.cause : undefined).toBe(driverError)
  })

  it("rethrows an unrecognised error untouched", () => {
    const driverError = new Error("D1_ERROR: database is locked")

    expect(() => rethrowProductMutationError(driverError)).toThrow(driverError)
  })

  it("rethrows a thrown non error value untouched", () => {
    expect(() => rethrowProductMutationError("plain string")).toThrow()
  })
})

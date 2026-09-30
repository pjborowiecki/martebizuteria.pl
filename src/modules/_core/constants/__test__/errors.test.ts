import { describe, expect, it } from "vite-plus/test"

import { AppError, ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"

const NON_STRING_CODE = 500

describe("ERROR_CODES", () => {
  it("maps every name to its own literal so codes survive serialisation", () => {
    for (const [name, code] of Object.entries(ERROR_CODES)) {
      expect(code).toBe(name)
    }
  })
})

describe("AppError", () => {
  it("uses the code as the message when none is given", () => {
    const error = new AppError(ERROR_CODES.NOT_FOUND)

    expect(error.message).toBe("NOT_FOUND")
    expect(error.code).toBe("NOT_FOUND")
  })

  it("keeps an explicit message alongside the code", () => {
    const error = new AppError(ERROR_CODES.VALIDATION, "Title is required")

    expect(error.message).toBe("Title is required")
    expect(error.code).toBe("VALIDATION")
  })

  it("is a real Error named AppError", () => {
    const error = new AppError(ERROR_CODES.FORBIDDEN)

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe("AppError")
  })
})

describe("errorCode", () => {
  it("reads the code off an AppError", () => {
    expect(errorCode(new AppError(ERROR_CODES.CONFLICT))).toBe("CONFLICT")
  })

  it("reads a string code off any error carrying one", () => {
    const error = Object.assign(new Error("boom"), { code: "SQLITE_BUSY" })

    expect(errorCode(error)).toBe("SQLITE_BUSY")
  })

  it("returns an empty string for an error without a code", () => {
    expect(errorCode(new Error("boom"))).toBe("")
  })

  it("returns an empty string when the code is not a string", () => {
    const error = Object.assign(new Error("boom"), { code: NON_STRING_CODE })

    expect(errorCode(error)).toBe("")
  })

  it("returns an empty string for values that are not errors", () => {
    expect(errorCode({ code: "NOT_FOUND" })).toBe("")
    expect(errorCode("NOT_FOUND")).toBe("")
    expect(errorCode(undefined)).toBe("")
    expect(errorCode(null)).toBe("")
  })
})

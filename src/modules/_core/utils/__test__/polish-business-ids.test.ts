import { describe, expect, it } from "vite-plus/test"

import { isValidNip, isValidRegon, normalizeNip, normalizeRegon } from "~/src/modules/_core/utils/polish-business-ids"

describe("normalizeNip", () => {
  it.each([
    ["868-177-26-46", "8681772646"],
    ["868 177 26 46", "8681772646"],
    ["PL8681772646", "8681772646"],
    ["pl 868-177-26-46", "8681772646"],
  ])("writes %j as the bare ten digits", (input, expected) => {
    expect(normalizeNip(input)).toBe(expected)
  })
})

describe("isValidNip", () => {
  it.each(["8681772646", "5260250274"])("accepts %s, whose check digit matches", (nip) => {
    expect(isValidNip(nip)).toBe(true)
  })

  it.each([
    ["a wrong check digit", "8681772647"],
    ["a weighted sum whose remainder is ten", "1234567890"],
    ["nine digits", "868177264"],
    ["eleven digits", "86817726461"],
    ["letters", "868177264A"],
    ["nothing", ""],
  ])("refuses a NIP with %s", (_case, nip) => {
    expect(isValidNip(nip)).toBe(false)
  })
})

describe("normalizeRegon", () => {
  it("drops the spaces and dashes a REGON is often written with", () => {
    expect(normalizeRegon("384 616-568")).toBe("384616568")
  })
})

describe("isValidRegon", () => {
  it.each([
    ["the shop's nine-digit REGON", "384616568"],
    ["a nine-digit REGON whose remainder of ten gives check digit zero", "100000050"],
    ["a fourteen-digit REGON", "12345678512347"],
  ])("accepts %s", (_case, regon) => {
    expect(isValidRegon(regon)).toBe(true)
  })

  it.each([
    ["a wrong nine-digit check digit", "384616569"],
    ["a wrong fourteen-digit check digit", "12345678512348"],
    ["ten digits", "3846165680"],
    ["letters", "38461656A"],
    ["nothing", ""],
  ])("refuses %s", (_case, regon) => {
    expect(isValidRegon(regon)).toBe(false)
  })
})

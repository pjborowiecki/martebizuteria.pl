import { expect, it } from "vite-plus/test"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"

it("displays an em dash for a missing value instead of implying a numeric zero", () => {
  expect(EMPTY_VALUE).toBe("—")
})

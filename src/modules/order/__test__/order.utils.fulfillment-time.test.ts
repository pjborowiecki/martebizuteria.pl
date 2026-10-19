import { describe, expect, it } from "vite-plus/test"

import { describeOrderFulfillmentTime } from "~/src/modules/order/order.utils"

import englishCopy from "~/messages/en-US/emails.order-confirmation.json"
import polishCopy from "~/messages/pl-PL/emails.order-confirmation.json"

const polishFallback = `${polishCopy.fulfillmentTime.fallback}\n${polishCopy.fulfillmentTime.note}`

describe("describeOrderFulfillmentTime", () => {
  it("states the longest time when one product gives it and another product's page gives none", () => {
    const lines = [
      { time: "3 tygodnie", title: "Pierścionek Luna" },
      { time: undefined, title: "Zawieszka Sol" },
    ]

    expect(describeOrderFulfillmentTime(lines, polishCopy)).toBe(`3 tygodnie\n${polishCopy.fulfillmentTime.note}`)
  })

  it("states the 10 business days of § 7 when they are longer than every time a product page gives", () => {
    const lines = [
      { time: "5 dni roboczych", title: "Pierścionek Luna" },
      { time: undefined, title: "Zawieszka Sol" },
    ]

    expect(describeOrderFulfillmentTime(lines, polishCopy)).toBe(polishFallback)
  })

  it("states the longest time when every product page gives one", () => {
    const lines = [
      { time: "2 dni robocze", title: "Pierścionek Luna" },
      { time: "7 dni roboczych", title: "Zawieszka Sol" },
      { time: "3 dni robocze", title: "Kolczyki Aurora" },
    ]

    expect(describeOrderFulfillmentTime(lines, polishCopy)).toBe(`7 dni roboczych\n${polishCopy.fulfillmentTime.note}`)
  })

  it("writes the time and the rule in English for an English order", () => {
    const lines = [
      { time: "3 weeks", title: "Luna ring" },
      { time: undefined, title: "Sol pendant" },
    ]

    expect(describeOrderFulfillmentTime(lines, englishCopy)).toBe(`3 weeks\n${englishCopy.fulfillmentTime.note}`)
    expect(describeOrderFulfillmentTime([{ time: undefined, title: "Sol pendant" }], englishCopy)).toBe(
      `${englishCopy.fulfillmentTime.fallback}\n${englishCopy.fulfillmentTime.note}`,
    )
  })

  it.each([
    ["48 godzin", polishFallback],
    ["10 dni", polishFallback],
    ["1,5 tygodnia", polishFallback],
    ["14 dni roboczych", `14 dni roboczych\n${polishCopy.fulfillmentTime.note}`],
    ["20 days", `20 days\n${polishCopy.fulfillmentTime.note}`],
    ["15 business days", `15 business days\n${polishCopy.fulfillmentTime.note}`],
    ["2.5 weeks", `2.5 weeks\n${polishCopy.fulfillmentTime.note}`],
    ["2-3 tygodnie", `2-3 tygodnie\n${polishCopy.fulfillmentTime.note}`],
    ["do 3 tygodni", `do 3 tygodni\n${polishCopy.fulfillmentTime.note}`],
    ["1 miesiąc", `1 miesiąc\n${polishCopy.fulfillmentTime.note}`],
  ])("weighs %j against the 10 business days of a page without a time", (time, expected) => {
    const lines = [
      { time, title: "Pierścionek Luna" },
      { time: undefined, title: "Zawieszka Sol" },
    ]

    expect(describeOrderFulfillmentTime(lines, polishCopy)).toBe(expected)
  })

  it.each(["na zamówienie", "14"])("lists each product's own time when %j cannot be compared with the others", (time) => {
    const lines = [
      { time, title: "Pierścionek Luna" },
      { time: undefined, title: "Zawieszka Sol" },
      { time, title: "Pierścionek Luna" },
    ]

    expect(describeOrderFulfillmentTime(lines, polishCopy)).toBe(
      `Pierścionek Luna: ${time}\nZawieszka Sol: ${polishCopy.fulfillmentTime.fallback}\n${polishCopy.fulfillmentTime.note}`,
    )
  })

  it("states the 10 business days of § 7 for an order without lines", () => {
    expect(describeOrderFulfillmentTime([], polishCopy)).toBe(polishFallback)
  })
})

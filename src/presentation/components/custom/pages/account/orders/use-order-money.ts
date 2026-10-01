import { useFormatter } from "use-intl/react"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"

export const useOrderMoney = (currencyCode: string): ((minorUnits: number) => string) => {
  const format = useFormatter()

  return (minorUnits: number) =>
    format.number(centsToDisplayAmount(minorUnits), {
      currency: currencyCode,
      style: "currency",
    })
}

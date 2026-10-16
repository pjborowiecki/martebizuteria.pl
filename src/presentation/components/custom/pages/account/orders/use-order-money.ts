import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"

import { useFormatter } from "~/src/hooks/use-display-format"

export const useOrderMoney = (currencyCode: string): ((minorUnits: number) => string) => {
  const format = useFormatter()

  return (minorUnits: number) =>
    format.number(centsToDisplayAmount(minorUnits), {
      currency: currencyCode,
      style: "currency",
    })
}

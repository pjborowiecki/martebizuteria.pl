import { BASIS_POINTS_SCALE, STANDARD_VAT_BASIS_POINTS } from "~/src/modules/_core/constants/tax"

export const netFromGross = (grossMinorUnits: number, basisPoints: number = STANDARD_VAT_BASIS_POINTS): number =>
  Math.round((grossMinorUnits * BASIS_POINTS_SCALE) / (BASIS_POINTS_SCALE + basisPoints))

export const vatFromGross = (grossMinorUnits: number, basisPoints: number = STANDARD_VAT_BASIS_POINTS): number =>
  grossMinorUnits - netFromGross(grossMinorUnits, basisPoints)

export const formatVatRatePercent = (basisPoints: number = STANDARD_VAT_BASIS_POINTS): string =>
  String(basisPoints / (BASIS_POINTS_SCALE / PERCENT_SCALE))

const PERCENT_SCALE = 100

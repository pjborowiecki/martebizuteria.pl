import { formatCountryName } from "~/src/modules/_core/utils/country-name"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

const NOT_DIALLED = /[^\d+]/gu

export const formatSellerPostalAddress = (
  { city, countryCode, legalName, postalCode, street }: Readonly<StoreSetting["sellerDetails"]>,
  locale: string,
): string[] => [legalName, street, `${postalCode} ${city}`, formatCountryName(countryCode, locale)]

export const toSellerPhoneHref = (phone: string): string => `tel:${phone.replaceAll(NOT_DIALLED, "")}`

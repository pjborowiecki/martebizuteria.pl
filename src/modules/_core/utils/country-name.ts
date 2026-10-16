export const formatCountryName = (countryCode: string, locale: string): string => {
  try {
    return new Intl.DisplayNames([locale], { fallback: "none", type: "region" }).of(countryCode) ?? countryCode
  } catch {
    return countryCode
  }
}

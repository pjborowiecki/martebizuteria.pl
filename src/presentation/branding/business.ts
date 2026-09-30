export const BUSINESS = {
  CITY: "Bochnia",
  COUNTRY_CODE: "PL",
  EMAIL: "kontakt@martebizuteria.pl",
  LEGAL_NAME: "Pyciak Mariusz Firma Jubilerska",
  NIP: "8681772646",
  OPENING_HOURS_CLOSE: "17:00",
  OPENING_HOURS_OPEN: "09:00",
  PHONE: "+48 663 150 820",
  POSTAL_CODE: "32-700",
  REGON: "384616568",
  STREET: "ul. Wąska 11",
} as const

export const BUSINESS_POSTAL_ADDRESS_LINES = [BUSINESS.LEGAL_NAME, BUSINESS.STREET, `${BUSINESS.POSTAL_CODE} ${BUSINESS.CITY}`] as const

export const INPOST_LOCKERS = {
  krucza: {
    address_details: {
      building_number: "5",
      city: "Warszawa",
      flat_number: null,
      post_code: "00-548",
      province: "mazowieckie",
      street: "Krucza",
    },
    location: { latitude: 52.2275, longitude: 21.0187 },
    location_description: "Obok wejścia do biurowca",
    name: "WAW01M",
    status: "Operating",
  },
  marszalkowska: {
    address_details: {
      building_number: "100",
      city: "Warszawa",
      flat_number: null,
      post_code: "00-026",
      province: "mazowieckie",
      street: "Marszałkowska",
    },
    location: { latitude: 52.2297, longitude: 21.0122 },
    location_description: "W pasażu handlowym",
    name: "WAW02M",
    status: "Operating",
  },
} as const

export const INPOST_POINTS = { listed: INPOST_LOCKERS.krucza.name, unanswered: "WAW503", unlisted: "WAW99X" } as const

export type InpostLocker = (typeof INPOST_LOCKERS)[keyof typeof INPOST_LOCKERS]

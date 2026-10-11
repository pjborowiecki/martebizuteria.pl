import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

const INPOST_POINT_PATH = /^\/v1\/points\/(?<name>[^/]+)$/u

const INPOST_LISTED_POINTS = [
  {
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
  {
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
] as const

const INPOST_UNANSWERED_POINT_NAME = "WAW503"

export const emulateInpostPoints = (url: URL): Response => {
  const name = INPOST_POINT_PATH.exec(url.pathname)?.groups?.["name"]
  if (name === INPOST_UNANSWERED_POINT_NAME) {
    return new Response("Service Unavailable", { status: HTTP_STATUS.SERVICE_UNAVAILABLE })
  }

  const point = INPOST_LISTED_POINTS.find((listed) => listed.name === name)

  return point === undefined ? Response.json({ error: "resource_not_found" }, { status: HTTP_STATUS.NOT_FOUND }) : Response.json(point)
}

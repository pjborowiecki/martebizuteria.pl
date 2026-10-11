import { type Route } from "@playwright/test"

import { INPOST_LOCKERS } from "../data/inpost"

const INPOST_POINTS_SEARCH = "https://api-pl-points.easypack24.net/v1/points"

const POLISH = "pl-PL"

export const isInpostPointSearch = (url: URL): boolean => `${url.origin}${url.pathname}` === INPOST_POINTS_SEARCH

export const answerInpostPointSearch = async (route: Route, url: URL): Promise<void> => {
  const city = url.searchParams.get("city")?.toLocaleLowerCase(POLISH)
  const items = Object.values(INPOST_LOCKERS).filter((locker) => locker.address_details.city.toLocaleLowerCase(POLISH) === city)

  await route.fulfill({ headers: { "access-control-allow-origin": "*" }, json: { count: items.length, items } })
}

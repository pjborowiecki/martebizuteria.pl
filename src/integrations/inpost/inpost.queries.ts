import { queryOptions } from "@tanstack/react-query";

import { CONSTANTS } from "~/src/constants";

import { fetchPointsByCity } from "~/src/integrations/inpost/inpost.api";

const ONE_DAY_IN_MS = 86_400_000;
const TWO_DAYS_IN_MS = 172_800_000;

export const MIN_CITY_LENGTH = 3;

export const inpostQueryOptions = {
  pointsByCity: (city: string) =>
    queryOptions({
      enabled: city.trim().length >= MIN_CITY_LENGTH,
      gcTime: TWO_DAYS_IN_MS,
      queryFn: () => fetchPointsByCity(city),
      queryKey: [...CONSTANTS.QUERY_KEYS.INPOST.BY_CITY, city.trim().toLowerCase()] as const,
      staleTime: ONE_DAY_IN_MS
    })
};

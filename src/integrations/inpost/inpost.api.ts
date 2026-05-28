import { inpostApiResponseSchema, type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod";

const INPOST_API_BASE = "https://api-pl-points.easypack24.net/v1/points";
const MIN_CITY_LENGTH = 3;

/**
 * Capitalize a city name for the InPost API (case-sensitive).
 * Handles multi-word names like "Nowy Sącz" → "Nowy Sącz".
 */
function capitalizeCity(city: string): string {
  return city.toLowerCase().replaceAll(/(^\p{L}|[\s-]\p{L})/gu, (char) => char.toUpperCase());
}

export async function fetchPointsByCity(city: string): Promise<InpostPointParsed[]> {
  const trimmed = city.trim();
  if (trimmed.length < MIN_CITY_LENGTH) {
    return [];
  }

  const url = `${INPOST_API_BASE}?city=${encodeURIComponent(capitalizeCity(trimmed))}&per_page=1000`;
  console.log("[InPost] Fetching:", url);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`InPost API error: ${String(response.status)}`);
  }

  const raw: unknown = await response.json();
  const parsed = inpostApiResponseSchema.safeParse(raw);

  if (!parsed.success) {
    return [];
  }

  return parsed.data.items;
}

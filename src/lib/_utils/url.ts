import { CONSTANTS } from "~/src/constants";

export function getBaseURL(): string {
  if (!import.meta.env.PROD) {
    return CONSTANTS.DEFAULT_APP_URL;
  }

  const url: unknown = import.meta.env.VITE_APP_URL;
  if (typeof url === "string") {
    return url;
  }

  return CONSTANTS.DEFAULT_APP_URL;
}

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

export function getAssetURL(path: string): string {
  const baseUrl: unknown = import.meta.env.VITE_R2_URL;

  if (typeof baseUrl !== "string" || baseUrl === "") {
    return `/${path.replace(/^\//u, "")}`;
  }

  const cleanBase = baseUrl.replace(/\/$/u, "");
  const cleanPath = path.replace(/^\//u, "");

  return `${cleanBase}/${cleanPath}`;
}

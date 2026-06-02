const ADMIN_PATH_SEGMENT = "/admin";

/** True when the pathname is under the admin panel (any locale prefix). */
export function isAdminPathname(pathname: string): boolean {
  return pathname.includes(ADMIN_PATH_SEGMENT);
}

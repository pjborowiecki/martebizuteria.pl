export const isAdminPathname = (pathname: string): boolean => pathname.includes(ADMIN_PATH_SEGMENT)

const ADMIN_PATH_SEGMENT = "/admin"

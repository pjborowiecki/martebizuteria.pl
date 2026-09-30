import { ROUTES } from "~/src/routes"

export const isAdminPathname = (pathname: string): boolean => pathname.includes(ROUTES.ADMIN)

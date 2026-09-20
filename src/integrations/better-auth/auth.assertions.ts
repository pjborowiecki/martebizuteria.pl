import { hasAdminAccess } from "~/src/integrations/better-auth/auth.permissions"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
export const assertAdmin = async (): Promise<AdminSessionUser> => {
  const session = await getRequestSession()
  const user = session?.user
  if (!hasAdminAccess(user?.role)) {
    throw new Error(AUTH_ERROR_CODES.UNAUTHORIZED)
  }
  return user
}
export const AUTH_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
} as const
type AdminSessionUser = NonNullable<Awaited<ReturnType<typeof getRequestSession>>>["user"]

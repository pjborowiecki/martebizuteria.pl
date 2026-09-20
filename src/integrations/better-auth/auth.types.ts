import { type ROLES } from "~/src/integrations/better-auth/auth.constants"

export type Role = (typeof ROLES)[keyof typeof ROLES]

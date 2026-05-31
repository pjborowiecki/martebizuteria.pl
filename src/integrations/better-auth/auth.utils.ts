import { z } from "zod/v4";

import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors";

const authErrorSchema = z.object({ code: z.string() });

export function getAuthErrorMessage(t: (key: string) => string, error: unknown): string {
  const { data } = authErrorSchema.safeParse(error);
  const key = AUTH_ERRORS[data?.code ?? ""] ?? AUTH_ERRORS.UNKNOWN_ERROR;
  return t(`auth.errors.${key}`);
}

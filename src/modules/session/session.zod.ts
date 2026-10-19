import zod from "zod/v4"

export const sessionZodSchemas = {
  sessionIdInput: zod.object({
    sessionId: zod.string().min(1),
  }),
}

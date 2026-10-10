import { z } from "zod"

import { TURNSTILE_TOKEN_MAX_LENGTH } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"

export const turnstileTokenSchema = z.string().min(1).max(TURNSTILE_TOKEN_MAX_LENGTH)

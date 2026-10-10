import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { z } from "zod"

import {
  TURNSTILE_ERROR_CODES,
  TURNSTILE_SITEVERIFY_URL,
  type TurnstileAction,
} from "~/src/integrations/cloudflare-turnstile/turnstile.constants"
import { isTurnstileTestingKey } from "~/src/integrations/cloudflare-turnstile/turnstile.keys"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

const SITEVERIFY_TIMEOUT_MS = 10_000

const siteverifyVerdictSchema = z.object({
  action: z.string().optional(),
  hostname: z.string().optional(),
  success: z.boolean(),
})

type SiteverifyVerdict = z.infer<typeof siteverifyVerdictSchema>

const UNCHECKED: SiteverifyVerdict = { success: false }

const readSiteverifyVerdict = async ({ remoteIp, token }: Pick<TurnstileTokenCheck, "remoteIp" | "token">): Promise<SiteverifyVerdict> => {
  const body = new URLSearchParams({ response: token, secret: env.TURNSTILE_SECRET_KEY })
  if (remoteIp !== undefined) {
    body.set("remoteip", remoteIp)
  }

  try {
    const response = await fetch(TURNSTILE_SITEVERIFY_URL, { body, method: "POST", signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS) })
    if (!response.ok) {
      throw new Error(`Turnstile siteverify answered ${String(response.status)}`)
    }

    return siteverifyVerdictSchema.parse(await response.json())
  } catch (error) {
    console.error("Turnstile siteverify could not check a token", error)

    return UNCHECKED
  }
}

const isIssuedFor = (verdict: SiteverifyVerdict, { action, hostname }: Pick<TurnstileTokenCheck, "action" | "hostname">): boolean =>
  isTurnstileTestingKey(env.TURNSTILE_SECRET_KEY) || (verdict.action === action && verdict.hostname === hostname)

export const passesTurnstile = async (check: TurnstileTokenCheck): Promise<boolean> => {
  const verdict = await readSiteverifyVerdict(check)

  return verdict.success && isIssuedFor(verdict, check)
}

export const verifyTurnstileToken = async (check: TurnstileTokenCheck): Promise<void> => {
  if (!(await passesTurnstile(check))) {
    throw new AppError(ERROR_CODES.FORBIDDEN, TURNSTILE_ERROR_CODES.BOT_CHECK_FAILED)
  }
}

interface TurnstileTokenCheck {
  readonly action: TurnstileAction
  readonly hostname: string
  readonly remoteIp: string | undefined
  readonly token: string
}

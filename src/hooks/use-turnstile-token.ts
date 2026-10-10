import { type RefObject, useCallback, useRef } from "react"

import { createClientOnlyFn } from "@tanstack/react-start"

import { issueTurnstileToken } from "~/src/integrations/cloudflare-turnstile/turnstile.client"
import { TURNSTILE_ERROR_CODES, type TurnstileAction } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"

const issueToken = createClientOnlyFn((request: Parameters<typeof issueTurnstileToken>[0]) => issueTurnstileToken(request))

export const useTurnstileToken = (action: TurnstileAction): TurnstileTokenSource => {
  const containerRef = useRef<HTMLDivElement>(null)
  const requestToken = useCallback((): Promise<string> => {
    const container = containerRef.current
    if (container === null) {
      return Promise.reject(new Error(TURNSTILE_ERROR_CODES.BOT_CHECK_FAILED))
    }

    return issueToken({ action, container })
  }, [action])

  return { containerRef, requestToken }
}

interface TurnstileTokenSource {
  readonly containerRef: RefObject<HTMLDivElement | null>
  readonly requestToken: () => Promise<string>
}

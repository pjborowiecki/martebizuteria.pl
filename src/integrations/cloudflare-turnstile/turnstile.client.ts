import {
  TURNSTILE_ERROR_CODES,
  TURNSTILE_SCRIPT_URL,
  type TurnstileAction,
} from "~/src/integrations/cloudflare-turnstile/turnstile.constants"

interface TurnstileRenderOptions {
  readonly action: TurnstileAction
  readonly appearance: "interaction-only"
  readonly callback: (token: string) => void
  readonly "error-callback": (errorCode: string) => boolean
  readonly sitekey: string
  readonly size: "flexible"
}

interface TurnstileApi {
  readonly remove: (container: HTMLElement) => void
  readonly render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const turnstileRef: { current: Promise<TurnstileApi> | undefined } = { current: undefined }

const botCheckFailed = (): Error => new Error(TURNSTILE_ERROR_CODES.BOT_CHECK_FAILED)

const injectTurnstileScript = (): Promise<TurnstileApi> =>
  new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true
    script.addEventListener("load", () => {
      if (globalThis.window.turnstile === undefined) {
        reject(botCheckFailed())
      } else {
        resolve(globalThis.window.turnstile)
      }
    })
    script.addEventListener("error", () => {
      script.remove()
      reject(botCheckFailed())
    })
    document.head.insertBefore(script, null)
  })

const loadTurnstile = (): Promise<TurnstileApi> => {
  turnstileRef.current ??= injectTurnstileScript().catch((error: unknown) => {
    turnstileRef.current = undefined
    throw error
  })

  return turnstileRef.current
}

export const issueTurnstileToken = async ({ action, container }: Readonly<TurnstileTokenRequest>): Promise<string> => {
  if (siteKey === undefined || siteKey === "") {
    console.error("VITE_TURNSTILE_SITE_KEY is missing, so the bot check cannot run.")
    throw botCheckFailed()
  }

  const turnstile = await loadTurnstile()

  return new Promise((resolve, reject) => {
    turnstile.render(container, {
      action,
      appearance: "interaction-only",
      callback: (token) => {
        turnstile.remove(container)
        resolve(token)
      },
      "error-callback": (errorCode) => {
        console.error(`Turnstile could not check this visitor: ${errorCode}`)
        turnstile.remove(container)
        reject(botCheckFailed())

        return true
      },
      sitekey: siteKey,
      size: "flexible",
    })
  })
}

interface TurnstileTokenRequest {
  readonly action: TurnstileAction
  readonly container: HTMLElement
}

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TURNSTILE_SCRIPT_URL, TURNSTILE_TESTING_KEYS } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"

interface RenderOptions {
  readonly action: string
  readonly appearance: string
  readonly callback: (token: string) => void
  readonly "error-callback": (errorCode: string) => boolean
  readonly sitekey: string
  readonly size: string
}

const render = vi.fn<(container: HTMLElement, options: RenderOptions) => string>(() => "widget-1")

const remove = vi.fn<(container: HTMLElement) => void>()

const loadClient = () => {
  vi.resetModules()

  return import("~/src/integrations/cloudflare-turnstile/turnstile.client")
}

const turnstileScripts = (): HTMLScriptElement[] => [...document.head.querySelectorAll<HTMLScriptElement>("script")]

const finishLoading = (api: unknown): void => {
  Object.defineProperty(globalThis.window, "turnstile", { configurable: true, value: api, writable: true })
  turnstileScripts().at(-1)?.dispatchEvent(new Event("load"))
}

const renderedOptions = async (): Promise<RenderOptions> => {
  await vi.waitFor(() => {
    expect(render).toHaveBeenCalled()
  })
  const options = render.mock.lastCall?.[1]
  if (options === undefined) {
    throw new Error("Turnstile rendered no widget")
  }

  return options
}

const container = document.createElement("div")

beforeEach(() => {
  render.mockClear()
  remove.mockClear()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  for (const script of turnstileScripts()) {
    script.remove()
  }
  Reflect.deleteProperty(globalThis.window, "turnstile")
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("issueTurnstileToken", () => {
  it("loads Turnstile for explicit rendering and resolves with the token of a widget shown only if the visitor must act", async () => {
    const { issueTurnstileToken } = await loadClient()

    const token = issueTurnstileToken({ action: "checkout", container })
    expect(turnstileScripts().map((script) => [script.src, script.async])).toStrictEqual([[TURNSTILE_SCRIPT_URL, true]])
    finishLoading({ remove, render })
    const options = await renderedOptions()
    options.callback("token-1")

    await expect(token).resolves.toBe("token-1")
    expect(render).toHaveBeenCalledWith(
      container,
      expect.objectContaining({
        action: "checkout",
        appearance: "interaction-only",
        sitekey: TURNSTILE_TESTING_KEYS.ALWAYS_PASSES_SITE_KEY,
        size: "flexible",
      }),
    )
    expect(remove).toHaveBeenCalledExactlyOnceWith(container)
  })

  it("loads the script once and renders a fresh widget for every token", async () => {
    const { issueTurnstileToken } = await loadClient()
    const first = issueTurnstileToken({ action: "checkout", container })
    finishLoading({ remove, render })
    const firstWidget = await renderedOptions()
    firstWidget.callback("token-1")
    await first

    const second = issueTurnstileToken({ action: "checkout", container })
    await vi.waitFor(() => {
      expect(render).toHaveBeenCalledTimes(2)
    })
    const secondWidget = await renderedOptions()
    secondWidget.callback("token-2")

    await expect(second).resolves.toBe("token-2")
    expect(turnstileScripts()).toHaveLength(1)
  })

  it("refuses with the bot check code and takes the widget down when Turnstile reports an error", async () => {
    const { issueTurnstileToken } = await loadClient()
    const token = issueTurnstileToken({ action: "checkout", container })
    finishLoading({ remove, render })

    const widget = await renderedOptions()
    const handled = widget["error-callback"]("110200")

    await expect(token).rejects.toThrow("BOT_CHECK_FAILED")
    expect(handled).toBe(true)
    expect(remove).toHaveBeenCalledExactlyOnceWith(container)
    expect(console.error).toHaveBeenCalledWith("Turnstile could not check this visitor: 110200")
  })

  it("refuses when the script cannot load, and loads it afresh on the next attempt", async () => {
    const { issueTurnstileToken } = await loadClient()
    const failed = issueTurnstileToken({ action: "checkout", container })
    turnstileScripts().at(-1)?.dispatchEvent(new Event("error"))

    await expect(failed).rejects.toThrow("BOT_CHECK_FAILED")
    expect(turnstileScripts()).toHaveLength(0)

    const retried = issueTurnstileToken({ action: "checkout", container })
    finishLoading({ remove, render })
    const widget = await renderedOptions()
    widget.callback("token-1")

    await expect(retried).resolves.toBe("token-1")
  })

  it("refuses when the script loads without defining Turnstile", async () => {
    const { issueTurnstileToken } = await loadClient()
    const token = issueTurnstileToken({ action: "checkout", container })

    turnstileScripts().at(-1)?.dispatchEvent(new Event("load"))

    await expect(token).rejects.toThrow("BOT_CHECK_FAILED")
    expect(render).not.toHaveBeenCalled()
  })

  it.each([[""], [undefined]])("refuses without loading anything when the build's site key is %j", async (siteKey) => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", siteKey)
    const { issueTurnstileToken } = await loadClient()

    await expect(issueTurnstileToken({ action: "checkout", container })).rejects.toThrow("BOT_CHECK_FAILED")
    expect(turnstileScripts()).toHaveLength(0)
    expect(console.error).toHaveBeenCalledWith("VITE_TURNSTILE_SITE_KEY is missing, so the bot check cannot run.")
  })
})

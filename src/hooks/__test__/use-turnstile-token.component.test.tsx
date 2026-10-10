import { type JSX, useCallback } from "react"

import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { issueTurnstileToken } = vi.hoisted(() => ({
  issueTurnstileToken: vi.fn<(request: { action: string; container: HTMLElement }) => Promise<string>>(),
}))

vi.mock("~/src/integrations/cloudflare-turnstile/turnstile.client", () => ({ issueTurnstileToken }))

import { useTurnstileToken } from "~/src/hooks/use-turnstile-token"

const SignUpCheck = ({ onToken }: Readonly<{ onToken: (token: string) => void }>): JSX.Element => {
  const { containerRef, requestToken } = useTurnstileToken("sign-up")
  const check = useCallback(() => {
    void requestToken().then(onToken)
  }, [onToken, requestToken])

  return (
    <div>
      <div data-testid="bot-check" ref={containerRef} />
      <button onClick={check} type="button">
        Check
      </button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  issueTurnstileToken.mockResolvedValue("turnstile-token-1")
})

afterEach(() => {
  cleanup()
})

describe("useTurnstileToken", () => {
  it("runs the check for its action in the container the component renders", async () => {
    const onToken = vi.fn<(token: string) => void>()
    render(<SignUpCheck onToken={onToken} />)

    await userEvent.setup().click(screen.getByRole("button", { name: "Check" }))

    await waitFor(() => {
      expect(onToken).toHaveBeenCalledExactlyOnceWith("turnstile-token-1")
    })
    expect(issueTurnstileToken).toHaveBeenCalledExactlyOnceWith({ action: "sign-up", container: screen.getByTestId("bot-check") })
  })

  it("refuses to run the check while no container is on the page", async () => {
    const { result } = renderHook(() => useTurnstileToken("newsletter"))

    await expect(result.current.requestToken()).rejects.toThrow("BOT_CHECK_FAILED")
    expect(issueTurnstileToken).not.toHaveBeenCalled()
  })

  it("keeps one token request across renders, so effects that depend on it do not run again", () => {
    const { rerender, result } = renderHook(() => useTurnstileToken("newsletter"))
    const first = result.current.requestToken

    rerender()

    expect(result.current.requestToken).toBe(first)
  })
})

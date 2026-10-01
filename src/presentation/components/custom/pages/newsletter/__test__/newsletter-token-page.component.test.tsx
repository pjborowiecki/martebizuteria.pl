import { type JSX, useState } from "react"

import { type UseMutationResult, useMutation } from "@tanstack/react-query"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

import { NewsletterTokenPage } from "~/src/presentation/components/custom/pages/newsletter/newsletter-token-page"

const { confirm } = vi.hoisted(() => ({
  confirm: vi.fn<(input: { token: string }) => Promise<Newsletter["tokenResult"]>>(),
}))

const Harness = ({ token }: Readonly<{ token: string | undefined }>): JSX.Element => {
  const [nudge, setNudge] = useState(0)
  const mutation = useMutation({ mutationFn: confirm, mutationKey: ["newsletter", "confirm"] }) as UseMutationResult<
    Newsletter["tokenResult"],
    Error,
    { readonly token: string }
  >

  return (
    <>
      <button
        onClick={() => {
          setNudge(nudge + 1)
        }}
        type="button"
      >
        re-render
      </button>
      <NewsletterTokenPage mutation={mutation} namespace="pages.newsletter.confirm" token={token} />
    </>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  confirm.mockResolvedValue({ email: "anna@example.com", result: "ok" })
})

afterEach(cleanup)

describe("NewsletterTokenPage", () => {
  it("spends the token as soon as the page opens", async () => {
    renderWithProviders(<Harness token="token-1234567890123456" />)

    expect(await screen.findByRole("heading", { name: "You are on the list" })).toBeInTheDocument()
    expect(confirm.mock.calls[0]?.[0]).toStrictEqual({ token: "token-1234567890123456" })
  })

  it("names the address that was confirmed", async () => {
    renderWithProviders(<Harness token="token-1234567890123456" />)

    expect(await screen.findByText(/anna@example\.com/u)).toBeInTheDocument()
  })

  it("spends the token only once, however often the component re-renders", async () => {
    renderWithProviders(<Harness token="token-1234567890123456" />)
    await screen.findByRole("heading", { name: "You are on the list" })

    fireEvent.click(screen.getByRole("button", { name: "re-render" }))
    fireEvent.click(screen.getByRole("button", { name: "re-render" }))

    expect(confirm).toHaveBeenCalledOnce()
  })

  it("reassures someone who follows the link a second time", async () => {
    confirm.mockResolvedValue({ email: "anna@example.com", result: "alreadyDone" })
    renderWithProviders(<Harness token="token-1234567890123456" />)

    expect(await screen.findByRole("heading", { name: "Already confirmed" })).toBeInTheDocument()
  })

  it("explains a link that no longer works", async () => {
    confirm.mockResolvedValue({ email: undefined, result: "invalid" })
    renderWithProviders(<Harness token="token-1234567890123456" />)

    expect(await screen.findByRole("heading", { name: "This link is no longer valid" })).toBeInTheDocument()
  })

  it("treats a missing token as invalid without calling the server", () => {
    renderWithProviders(<Harness token={undefined} />)

    expect(screen.getByRole("heading", { name: "This link is no longer valid" })).toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
  })

  it("explains itself rather than spinning forever when the request fails", async () => {
    confirm.mockRejectedValue(new Error("boom"))
    renderWithProviders(<Harness token="token-1234567890123456" />)

    expect(await screen.findByRole("heading", { name: "This link is no longer valid" })).toBeInTheDocument()
  })

  it("always offers a way back to the storefront", () => {
    renderWithProviders(<Harness token={undefined} />)

    expect(screen.getByRole("link", { name: "Return to store" }).getAttribute("href")).toBe("/")
  })
})

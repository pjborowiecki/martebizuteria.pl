import { type SVGProps } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { OAuthButton } from "~/src/presentation/components/custom/pages/auth/oauth-button"
import { SocialProviders } from "~/src/presentation/components/custom/pages/auth/social-providers"

const oauth = vi.hoisted(() => ({
  isPending: { current: false },
  mutate: vi.fn(),
}))

vi.mock("~/src/presentation/components/custom/pages/auth/hooks/use-oauth-sign-in", () => ({
  useOAuthSignIn: () => ({ isPending: oauth.isPending.current, mutate: oauth.mutate }),
}))

const ProviderIcon = (props: SVGProps<SVGSVGElement>) => <svg {...props} data-testid="provider-icon" />

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  oauth.isPending.current = false
})

describe("OAuthButton", () => {
  it("labels the button with the translated provider name", () => {
    renderWithProviders(<OAuthButton provider="google" label="Continue with Google" Icon={ProviderIcon} />)

    expect(screen.getByRole("button", { name: "Continue with Google" })).toHaveAttribute("id", "oauth-button-google")
  })

  it("starts the sign in for the provider it renders", async () => {
    renderWithProviders(<OAuthButton provider="github" label="Continue with GitHub" Icon={ProviderIcon} />)

    await userEvent.click(screen.getByRole("button", { name: "Continue with GitHub" }))

    expect(oauth.mutate).toHaveBeenCalledWith("github")
  })

  it("renders the provider icon while idle", () => {
    renderWithProviders(<OAuthButton provider="google" label="Continue with Google" Icon={ProviderIcon} />)

    expect(screen.getByTestId("provider-icon")).toBeInTheDocument()
  })

  it("disables itself and drops the icon while the sign in is pending", () => {
    oauth.isPending.current = true
    renderWithProviders(<OAuthButton provider="google" label="Continue with Google" Icon={ProviderIcon} />)

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled()
    expect(screen.queryByTestId("provider-icon")).not.toBeInTheDocument()
  })
})

describe("SocialProviders", () => {
  it("offers both configured providers with their translated labels", () => {
    renderWithProviders(<SocialProviders />)

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument()
  })

  it("starts the matching provider sign in", async () => {
    renderWithProviders(<SocialProviders />)

    await userEvent.click(screen.getByRole("button", { name: "Continue with GitHub" }))

    expect(oauth.mutate).toHaveBeenCalledWith("github")
  })
})

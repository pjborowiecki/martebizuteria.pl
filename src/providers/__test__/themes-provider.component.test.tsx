import { type ReactNode } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface ThemeProviderProps {
  readonly attribute: string
  readonly children: ReactNode
  readonly defaultTheme: string
  readonly disableTransitionOnChange: boolean
  readonly enableSystem: boolean
  readonly storage: string
  readonly storageKey: string
  readonly themes: readonly string[]
}

const captured = vi.hoisted(() => ({ props: undefined as Omit<ThemeProviderProps, "children"> | undefined }))

vi.mock("@wrksz/themes/client", () => ({
  ClientThemeProvider: ({ children, ...rest }: ThemeProviderProps) => {
    captured.props = rest

    return <div data-testid="theme-provider">{children}</div>
  },
}))

import { ThemesProvider } from "~/src/providers/themes-provider"

import { THEME_STORAGE_KEY } from "~/src/presentation/theme/theme-init"

const providerProps = (): Omit<ThemeProviderProps, "children"> => {
  const { props } = captured
  if (props === undefined) {
    throw new Error("the theme provider was never rendered")
  }

  return props
}

beforeEach(() => {
  captured.props = undefined
})

afterEach(cleanup)

describe("ThemesProvider", () => {
  it("renders whatever the app puts inside it", () => {
    render(
      <ThemesProvider>
        <span>storefront</span>
      </ThemesProvider>,
    )

    expect(screen.getByText("storefront")).toBeInTheDocument()
  })

  it("drives the theme through a class on the document", () => {
    render(
      <ThemesProvider>
        <span>storefront</span>
      </ThemesProvider>,
    )

    expect(providerProps().attribute).toBe("class")
  })

  it("offers only the light and dark themes and starts on light", () => {
    render(
      <ThemesProvider>
        <span>storefront</span>
      </ThemesProvider>,
    )

    expect(providerProps().themes).toStrictEqual(["light", "dark"])
    expect(providerProps().defaultTheme).toBe("light")
  })

  it("ignores the operating system preference so the store looks the same for everyone", () => {
    render(
      <ThemesProvider>
        <span>storefront</span>
      </ThemesProvider>,
    )

    expect(providerProps().enableSystem).toBe(false)
  })

  it("remembers the choice under the same key the inline boot script reads", () => {
    render(
      <ThemesProvider>
        <span>storefront</span>
      </ThemesProvider>,
    )

    expect(providerProps().storage).toBe("localStorage")
    expect(providerProps().storageKey).toBe(THEME_STORAGE_KEY)
  })

  it("suppresses transitions while the theme swaps", () => {
    render(
      <ThemesProvider>
        <span>storefront</span>
      </ThemesProvider>,
    )

    expect(providerProps().disableTransitionOnChange).toBe(true)
  })
})

import type * as ReactRouter from "@tanstack/react-router"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import type * as EmailPreviews from "~/src/integrations/resend/email-previews"

interface RouteDefinition {
  readonly server?: {
    readonly handlers?: {
      readonly GET?: (context: { readonly request: Request }) => Promise<Response>
    }
  }
}

const rendered = vi.hoisted(() => ({
  calls: [] as { locale: string; plainText: boolean; slug: string }[],
}))

const captured: { current: RouteDefinition | undefined } = { current: undefined }

vi.mock("~/src/integrations/resend/email-previews", async (importOriginal) => {
  const actual = await importOriginal<typeof EmailPreviews>()

  return {
    ...actual,
    renderEmailPreview: (slug: string, locale: string, plainText: boolean) => {
      rendered.calls.push({ locale, plainText, slug })

      return Promise.resolve(`rendered:${slug}:${locale}:${String(plainText)}`)
    },
  }
})
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return { options }
    },
  }
})

import { EMAIL_PREVIEWS } from "~/src/integrations/resend/email-previews"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

await import("~/src/routes/dev.emails")

const handler = captured.current?.server?.handlers?.GET

if (handler === undefined) {
  throw new Error("the email preview route registered no GET handler")
}

const get = (search: string): Promise<Response> => handler({ request: new Request(`http://127.0.0.1:3000/dev/emails${search}`) })

afterEach(() => {
  rendered.calls = []
  vi.unstubAllEnvs()
})

describe("email preview index", () => {
  it("answers with an html document", async () => {
    const response = await get("")

    expect(response.ok).toBe(true)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
  })

  it("lists every preview by its label", async () => {
    const index = await get("")
    const body = await index.text()

    for (const preview of Object.values(EMAIL_PREVIEWS)) {
      expect(body).toContain(`<strong>${preview.label}</strong>`)
    }
  })

  it("offers an html and a plain text link per locale for each template", async () => {
    const index = await get("")
    const body = await index.text()

    expect(body).toContain(`<a href="/dev/emails?template=verify-email&locale=en-US">EN-US HTML</a>`)
    expect(body).toContain(`<a href="/dev/emails?template=verify-email&locale=en-US&format=text">EN-US text</a>`)
    expect(body).toContain(`<a href="/dev/emails?template=verify-email&locale=pl-PL">PL-PL HTML</a>`)
    expect(body).toContain(`<a href="/dev/emails?template=verify-email&locale=pl-PL&format=text">PL-PL text</a>`)
  })

  it("renders no email just to build the index", async () => {
    await get("")

    expect(rendered.calls).toStrictEqual([])
  })
})

describe("email preview of a single template", () => {
  it("serves the rendered html for the requested locale", async () => {
    const response = await get("?template=verify-email&locale=en-US")

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(await response.text()).toBe("rendered:verify-email:en-US:false")
    expect(rendered.calls).toStrictEqual([{ locale: "en-US", plainText: false, slug: "verify-email" }])
  })

  it("serves the plain text alternative as text", async () => {
    const response = await get("?template=order-shipped&locale=pl-PL&format=text")

    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8")
    expect(await response.text()).toBe("rendered:order-shipped:pl-PL:true")
  })

  it("treats any other format as html", async () => {
    const response = await get("?template=order-shipped&locale=pl-PL&format=markdown")

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(rendered.calls).toStrictEqual([{ locale: "pl-PL", plainText: false, slug: "order-shipped" }])
  })

  it("falls back to the default locale when the one asked for is not supported", async () => {
    await get("?template=reset-password&locale=de-DE")

    expect(rendered.calls).toStrictEqual([{ locale: I18N.DEFAULT_LOCALE, plainText: false, slug: "reset-password" }])
  })

  it("falls back to the default locale when none is given", async () => {
    await get("?template=reset-password")

    expect(rendered.calls).toStrictEqual([{ locale: I18N.DEFAULT_LOCALE, plainText: false, slug: "reset-password" }])
  })

  it("refuses a template it does not know", async () => {
    const response = await get("?template=welcome-aboard")

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
    expect(await response.text()).toBe("Not found")
    expect(rendered.calls).toStrictEqual([])
  })
})

describe("email previews outside development", () => {
  it("hides the whole gallery", async () => {
    vi.stubEnv("DEV", false)

    const response = await get("")

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
    expect(await response.text()).toBe("Not found")
  })
})

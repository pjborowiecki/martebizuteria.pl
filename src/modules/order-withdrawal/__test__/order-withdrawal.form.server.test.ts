import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { assetsFetch } = vi.hoisted(() => ({
  assetsFetch: vi.fn<(input: URL) => Promise<Response>>(),
}))

vi.mock("cloudflare:workers", () => ({ env: { ASSETS: { fetch: assetsFetch } } }))

import { loadWithdrawalFormAttachment } from "~/src/modules/order-withdrawal/order-withdrawal.form.server"

const PUBLISHED_FORM = readFileSync("public/forms/formularz_zwrotu.pdf")

beforeEach(() => {
  assetsFetch.mockReset()
  assetsFetch.mockImplementation(() => Promise.resolve(new Response(PUBLISHED_FORM)))
})

describe("loadWithdrawalFormAttachment", () => {
  it("reads the form the returns page links from the static assets of the deployment the order came from", async () => {
    await loadWithdrawalFormAttachment("https://preview.martebizuteria.pl")

    expect(assetsFetch).toHaveBeenCalledExactlyOnceWith(new URL("https://preview.martebizuteria.pl/forms/formularz_zwrotu.pdf"))
  })

  it("attaches the published PDF byte for byte under its own file name", async () => {
    const attachment = await loadWithdrawalFormAttachment("http://127.0.0.1:3000")

    expect(attachment).toStrictEqual({
      content: PUBLISHED_FORM.toString("base64"),
      contentType: "application/pdf",
      filename: "formularz_zwrotu.pdf",
    })
    expect(PUBLISHED_FORM.subarray(0, 5).toString("latin1")).toBe("%PDF-")
  })

  it("refuses to prepare the email when the deployment does not serve the form", async () => {
    assetsFetch.mockResolvedValue(new Response("Not Found", { status: 404 }))

    await expect(loadWithdrawalFormAttachment("https://martebizuteria.pl")).rejects.toThrow(
      "The withdrawal form /forms/formularz_zwrotu.pdf could not be read from the static assets: HTTP 404",
    )
  })
})

import { Buffer } from "node:buffer"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { readPdf, readPublicAsset } from "~/src/platform/testing/lib/pdf"
import { TEST_STORED_SELLER_DETAILS } from "~/src/platform/testing/mocks/seller-details"

const { assetsFetch } = vi.hoisted(() => ({
  assetsFetch: vi.fn<(input: URL) => Promise<Response>>(),
}))

vi.mock("cloudflare:workers", () => ({ env: { ASSETS: { fetch: assetsFetch } } }))

const { loadWithdrawalFormAttachment } = await import("~/src/modules/order-withdrawal/order-withdrawal.form.server")

beforeEach(() => {
  assetsFetch.mockReset()
  assetsFetch.mockImplementation((input) => Promise.resolve(new Response(readPublicAsset(input.pathname))))
})

describe("loadWithdrawalFormAttachment", () => {
  it("attaches the withdrawal form made from the seller details of the e-mail under the file name the legal pages link to", async () => {
    const attachment = await loadWithdrawalFormAttachment(TEST_STORED_SELLER_DETAILS, "http://127.0.0.1:3000")
    const form = await readPdf(Buffer.from(String(attachment.content), "base64"))

    expect(attachment).toMatchObject({ contentType: "application/pdf", filename: "formularz_zwrotu.pdf" })
    expect(form.lines).toContain("– Adresat: Pracownia Testowa Anna Nowak, ul. Floriańska 1, 31-001 Kraków, adres e-mail: sklep@marte.test")
  })

  it("reads the form fonts from the static assets of the deployment the order came from", async () => {
    await loadWithdrawalFormAttachment(TEST_STORED_SELLER_DETAILS, "https://preview.martebizuteria.pl")

    expect(assetsFetch.mock.calls.map(([url]) => url.origin)).toStrictEqual(
      Array.from({ length: 3 }, () => "https://preview.martebizuteria.pl"),
    )
  })

  it("refuses to prepare the e-mail when the deployment does not serve the form fonts", async () => {
    assetsFetch.mockResolvedValue(new Response("Not Found", { status: 404 }))

    await expect(loadWithdrawalFormAttachment(TEST_STORED_SELLER_DETAILS, "https://martebizuteria.pl")).rejects.toThrow(
      "The form font /fonts/forms/manrope-400-normal.ttf could not be read from the static assets: HTTP 404",
    )
  })
})

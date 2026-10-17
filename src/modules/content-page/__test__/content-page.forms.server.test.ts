import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { PDF_RENDER_TIMEOUT, readPdf, readPublicAsset } from "~/src/platform/testing/lib/pdf"
import { TEST_STORED_SELLER_DETAILS } from "~/src/platform/testing/mocks/seller-details"

import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

import { type FormFonts } from "~/src/presentation/pdf/form-document"

const { assetsFetch, readSellerDetails } = vi.hoisted(() => ({
  assetsFetch: vi.fn<(input: URL) => Promise<Response>>(),
  readSellerDetails: vi.fn<() => Promise<StoreSetting["storedSellerDetails"]>>(),
}))

vi.mock("cloudflare:workers", () => ({ env: { ASSETS: { fetch: assetsFetch } } }))
vi.mock("~/src/modules/store-setting/store-setting.accessors", () => ({ readSellerDetails }))

const { loadFormFonts, respondWithForm } = await import("~/src/modules/content-page/content-page.forms.server")
const { WITHDRAWAL_FORM } = await import("~/src/presentation/pdf/withdrawal-form")

const ORIGIN = "https://preview.martebizuteria.pl"

const ETAG = `"${TEST_STORED_SELLER_DETAILS.updatedAt.getTime()}"`

const CACHE_CONTROL = "public, max-age=300, must-revalidate"

const servePublicAsset = (input: URL): Promise<Response> => Promise.resolve(new Response(readPublicAsset(input.pathname)))

const formRequest = (headers: Record<string, string> = {}): Request => new Request(`${ORIGIN}/forms/formularz_zwrotu.pdf`, { headers })

const render = vi.fn<(seller: StoreSetting["storedSellerDetails"], fonts: FormFonts) => Promise<Uint8Array<ArrayBuffer>>>()

beforeEach(() => {
  assetsFetch.mockReset()
  assetsFetch.mockImplementation(servePublicAsset)
  readSellerDetails.mockReset()
  readSellerDetails.mockResolvedValue(TEST_STORED_SELLER_DETAILS)
  render.mockReset()
})

describe("loadFormFonts", PDF_RENDER_TIMEOUT, () => {
  it("reads the three form fonts from the static assets of the given deployment", async () => {
    const fonts = await loadFormFonts(ORIGIN)

    expect(assetsFetch.mock.calls.map(([url]) => url.href)).toStrictEqual([
      `${ORIGIN}/fonts/forms/manrope-400-normal.ttf`,
      `${ORIGIN}/fonts/forms/manrope-600-normal.ttf`,
      `${ORIGIN}/fonts/forms/cormorant-garamond-600-normal.ttf`,
    ])
    expect(fonts).toStrictEqual({
      sans: readPublicAsset("/fonts/forms/manrope-400-normal.ttf"),
      sansSemiBold: readPublicAsset("/fonts/forms/manrope-600-normal.ttf"),
      serifSemiBold: readPublicAsset("/fonts/forms/cormorant-garamond-600-normal.ttf"),
    })
  })

  it("refuses to make a form when the deployment does not serve one of its fonts", async () => {
    assetsFetch.mockImplementation((input) =>
      input.pathname.endsWith("manrope-600-normal.ttf")
        ? Promise.resolve(new Response("Not Found", { status: 404 }))
        : servePublicAsset(input),
    )

    await expect(loadFormFonts(ORIGIN)).rejects.toThrow(
      "The form font /fonts/forms/manrope-600-normal.ttf could not be read from the static assets: HTTP 404",
    )
  })
})

describe("respondWithForm", PDF_RENDER_TIMEOUT, () => {
  it("serves the form made from the stored seller details as an inline PDF under its own file name", async () => {
    const response = await respondWithForm(formRequest(), WITHDRAWAL_FORM)
    const form = await readPdf(new Uint8Array(await response.arrayBuffer()))

    expect(response.status).toBe(200)
    expect(Object.fromEntries(response.headers)).toStrictEqual({
      "cache-control": CACHE_CONTROL,
      "content-disposition": 'inline; filename="formularz_zwrotu.pdf"',
      "content-type": "application/pdf",
      etag: ETAG,
    })
    expect(form.lines).toContain("– Adresat: Pracownia Testowa Anna Nowak, ul. Floriańska 1, 31-001 Kraków, adres e-mail: sklep@marte.test")
  })

  it("gives the form a new ETag once the seller details are saved again, so an old copy is replaced", async () => {
    readSellerDetails.mockResolvedValue({ ...TEST_STORED_SELLER_DETAILS, updatedAt: new Date("2026-10-17T08:30:00.000Z") })
    render.mockResolvedValue(new TextEncoder().encode("%PDF-"))

    const response = await respondWithForm(formRequest({ "if-none-match": ETAG }), { ...WITHDRAWAL_FORM, render })

    expect(response.status).toBe(200)
    expect(response.headers.get("etag")).toBe(`"${Date.parse("2026-10-17T08:30:00.000Z")}"`)
    expect(render).toHaveBeenCalledExactlyOnceWith(
      { ...TEST_STORED_SELLER_DETAILS, updatedAt: new Date("2026-10-17T08:30:00.000Z") },
      await loadFormFonts(ORIGIN),
    )
  })

  it.each([ETAG, `W/${ETAG}`, `"1700000000000", ${ETAG}`, "*"])(
    "answers 304 Not Modified to a browser that sends If-None-Match: %s, without making the form",
    async (ifNoneMatch) => {
      const response = await respondWithForm(formRequest({ "if-none-match": ifNoneMatch }), { ...WITHDRAWAL_FORM, render })

      expect(response.status).toBe(304)
      expect(Object.fromEntries(response.headers)).toStrictEqual({ "cache-control": CACHE_CONTROL, etag: ETAG })
      await expect(response.text()).resolves.toBe("")
      expect(render).not.toHaveBeenCalled()
      expect(assetsFetch).not.toHaveBeenCalled()
    },
  )
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { getRequest } = vi.hoisted(() => ({ getRequest: vi.fn(() => new Request("https://martebizuteria.pl/privacy-policy")) }))

vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getRequest }
})

import { LEGAL_DOCUMENT_SLUGS, loadLegalPage } from "~/src/integrations/fumadocs/fumadocs.legal"
import { legalSource } from "~/src/integrations/fumadocs/fumadocs.source"

beforeEach(() => {
  getRequest.mockReturnValue(new Request("https://martebizuteria.pl/privacy-policy"))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("loadLegalPage", () => {
  it("resolves the Polish document for an unprefixed url, since Polish is the default locale", async () => {
    const page = await loadLegalPage(LEGAL_DOCUMENT_SLUGS.privacyPolicy)

    expect(page.title).toBe("Polityka prywatności")
    expect(page.path).toBe("privacy-policy.pl-PL.mdx")
  })

  it("resolves the English document for an English url", async () => {
    getRequest.mockReturnValue(new Request("https://martebizuteria.pl/en-US/privacy-policy"))

    const page = await loadLegalPage(LEGAL_DOCUMENT_SLUGS.privacyPolicy)

    expect(page.title).toBe("Privacy policy")
    expect(page.path).toBe("privacy-policy.en-US.mdx")
  })

  it("carries the description the head needs and the date the document was updated", async () => {
    const page = await loadLegalPage(LEGAL_DOCUMENT_SLUGS.exchangesAndReturns)

    expect(page.description).toBe("14-dniowe prawo odstąpienia od umowy, zwrot zamówienia M'Arte i zgłoszenie reklamacji.")
    expect(page.updated).toBe("2026-09-29")
  })

  it("signals not found when a configured document is absent from the collection", async () => {
    vi.spyOn(legalSource, "getPage").mockReturnValue(undefined)

    await expect(loadLegalPage(LEGAL_DOCUMENT_SLUGS.privacyPolicy)).rejects.toMatchObject({ isNotFound: true })
  })

  it("provides an empty head description when optional frontmatter is omitted", async () => {
    const existing = legalSource.getPage([LEGAL_DOCUMENT_SLUGS.privacyPolicy], "pl-PL")
    if (existing === undefined) {
      throw new Error("Privacy document fixture is missing")
    }
    vi.spyOn(legalSource, "getPage").mockReturnValue({ ...existing, data: { ...existing.data, description: undefined } })

    const page = await loadLegalPage(LEGAL_DOCUMENT_SLUGS.privacyPolicy)

    expect(page.description).toBe("")
    expect(page.path).toBe(existing.path)
    expect(page.title).toBe(existing.data.title)
  })
})

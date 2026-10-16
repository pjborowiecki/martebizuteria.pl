import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { downloadTextFile } from "~/src/modules/_core/utils/download"

describe("downloadTextFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("hands the browser a named download and releases the blob url", () => {
    const anchor = { click: vi.fn(), href: "", rel: "", setAttribute: vi.fn() }
    const createObjectURL = vi.fn(() => "blob:export")
    const revokeObjectURL = vi.fn()

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL })
    vi.stubGlobal("document", { createElement: vi.fn(() => anchor) })

    downloadTextFile({ content: "id,email", fileName: "customers-2026-10-16-1434.csv", mimeType: "text/csv;charset=utf-8" })

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(anchor.href).toBe("blob:export")
    expect(anchor.rel).toBe("noopener")
    expect(anchor.setAttribute).toHaveBeenCalledWith("download", "customers-2026-10-16-1434.csv")
    expect(anchor.click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:export")
  })

  it("types the blob with the media type of the format and keeps the text as UTF-8", async () => {
    const blobs: Blob[] = []

    vi.stubGlobal("URL", { createObjectURL: (blob: Blob) => blobs.push(blob) && "blob:export", revokeObjectURL: vi.fn() })
    vi.stubGlobal("document", { createElement: () => ({ click: vi.fn(), setAttribute: vi.fn() }) })

    downloadTextFile({ content: "Zażółć gęślą jaźń", fileName: "audit-log.txt", mimeType: "text/plain;charset=utf-8" })

    expect(blobs[0]?.type).toBe("text/plain;charset=utf-8")
    expect(await blobs[0]?.text()).toBe("Zażółć gęślą jaźń")
  })
})

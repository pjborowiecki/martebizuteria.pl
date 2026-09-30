import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { downloadCsvFile, escapeCsvField } from "~/src/modules/_core/utils/csv"

describe("escapeCsvField", () => {
  it("doubles embedded quotes so the field survives a round trip", () => {
    expect(escapeCsvField('Ring "Aurora"')).toBe('Ring ""Aurora""')
  })

  it("leaves commas and newlines to the surrounding quoting", () => {
    expect(escapeCsvField("Warsaw, PL\nsecond line")).toBe("Warsaw, PL\nsecond line")
  })

  it("leaves a plain field untouched", () => {
    expect(escapeCsvField("silver-ring")).toBe("silver-ring")
  })
})

describe("downloadCsvFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("hands the browser a named UTF-8 download and releases the blob url", () => {
    const anchor = { click: vi.fn(), href: "", rel: "", setAttribute: vi.fn() }
    const createObjectURL = vi.fn(() => "blob:csv")
    const revokeObjectURL = vi.fn()

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL })
    vi.stubGlobal("document", { createElement: vi.fn(() => anchor) })

    downloadCsvFile("customers.csv", "id,email\n1,a@b.test")

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(anchor.href).toBe("blob:csv")
    expect(anchor.rel).toBe("noopener")
    expect(anchor.setAttribute).toHaveBeenCalledWith("download", "customers.csv")
    expect(anchor.click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:csv")
  })

  it("marks the blob as CSV so spreadsheets open it directly", async () => {
    const blobs: Blob[] = []

    vi.stubGlobal("URL", { createObjectURL: (blob: Blob) => blobs.push(blob) && "blob:csv", revokeObjectURL: vi.fn() })
    vi.stubGlobal("document", { createElement: () => ({ click: vi.fn(), setAttribute: vi.fn() }) })

    downloadCsvFile("export.csv", "a,b")

    expect(blobs[0]?.type).toBe("text/csv;charset=utf-8;")
    expect(await blobs[0]?.text()).toBe("a,b")
  })
})

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vite-plus/test"

const SOURCE_ROOT = "src"

const DEFINING_FILE = "presentation/branding/app.ts"

const listSourceFiles = (dir: string, prefix = ""): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) {
      return entry.name === "__test__" ? [] : listSourceFiles(join(dir, entry.name), relative)
    }

    return /\.tsx?$/u.test(entry.name) ? [relative] : []
  })

const sourceFiles = listSourceFiles(SOURCE_ROOT)

const filesMatching = (pattern: RegExp): string[] =>
  sourceFiles.filter((file) => pattern.test(readFileSync(join(SOURCE_ROOT, file), "utf8"))).toSorted()

describe("production address", () => {
  it("finds source files to check", () => {
    expect(sourceFiles).toContain(DEFINING_FILE)
  })

  it("leaves APP_URL to the canonical address, never to email links or Stripe return URLs", () => {
    expect(filesMatching(/\bAPP_URL\b/u)).toStrictEqual(["lib/image.ts", "lib/seo.ts", DEFINING_FILE, "routes/__root.tsx"])
  })

  it("leaves APP_DOMAIN to the deployment host list and the sender check", () => {
    expect(filesMatching(/\bAPP_DOMAIN\b/u)).toStrictEqual([
      "integrations/resend/resend.sender.ts",
      "modules/_core/constants/api.ts",
      DEFINING_FILE,
    ])
  })

  it("writes a web address on the production domain out by hand only in the dev-only email previews", () => {
    expect(filesMatching(/https?:\/\/(?:[\w-]+\.)*(?:martebizuteria\.pl|\$\{APP_DOMAIN\})/u)).toStrictEqual([
      "integrations/resend/email-previews.tsx",
      DEFINING_FILE,
    ])
  })
})

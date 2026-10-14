import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vite-plus/test"

const SOURCE_ROOT = "src"

const SKIPPED_SHADCN_SOURCES = /@source not "\.\.\/components\/shadcn\/\{(?<names>[^}]+)\}\.tsx";/u

const listProductionFiles = (dir: string, prefix = ""): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) {
      return entry.name === "__test__" || relative === "platform/testing" ? [] : listProductionFiles(join(dir, entry.name), relative)
    }

    return /\.tsx?$/u.test(entry.name) && !/\.(?:test|spec)\.tsx?$/u.test(entry.name) ? [relative] : []
  })

const globalsCss = readFileSync(join(SOURCE_ROOT, "presentation/styles/globals.css"), "utf8")

const skippedNames = SKIPPED_SHADCN_SOURCES.exec(globalsCss)?.groups?.["names"]

const skippedComponents = skippedNames === undefined ? [] : skippedNames.split(",")

const skippedFiles = new Set(skippedComponents.map((name) => `presentation/components/shadcn/${name}.tsx`))

const productionSources = listProductionFiles(SOURCE_ROOT)
  .filter((file) => !skippedFiles.has(file))
  .map((file) => ({ file, source: readFileSync(join(SOURCE_ROOT, file), "utf8") }))

const importersOf = (name: string): string[] =>
  productionSources.filter(({ source }) => source.includes(`/components/shadcn/${name}"`)).map(({ file }) => file)

describe("Tailwind source scan", () => {
  it("finds the shadcn components it skips", () => {
    expect(skippedComponents).toContain("toggle-group")
  })

  it.each(skippedComponents)("skips %s only while no production source imports it", (name) => {
    expect(importersOf(name)).toStrictEqual([])
  })
})

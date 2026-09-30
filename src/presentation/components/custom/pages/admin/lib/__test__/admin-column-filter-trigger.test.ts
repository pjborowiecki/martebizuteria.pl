import { describe, expect, it } from "vite-plus/test"

import { adminColumnFilterTriggerClass } from "~/src/presentation/components/custom/pages/admin/lib/admin-column-filter-trigger"

const classes = (isActive: boolean): readonly string[] => adminColumnFilterTriggerClass(isActive).split(" ")

describe("adminColumnFilterTriggerClass", () => {
  it.each([[true], [false]])("keeps the shared trigger geometry when active is %s", (isActive) => {
    expect(classes(isActive)).toContain("h-9")
    expect(classes(isActive)).toContain("cursor-pointer")
    expect(classes(isActive)).toContain("rounded-lg")
  })

  it("highlights the trigger with the primary accent once a filter is applied", () => {
    expect(classes(true)).toContain("border-primary/40")
    expect(classes(true)).toContain("bg-primary/5")
    expect(classes(true)).toContain("text-foreground")
  })

  it("drops the idle border and background that the active accent replaces", () => {
    expect(classes(true)).not.toContain("border-border")
    expect(classes(true)).not.toContain("bg-background")
  })

  it("keeps the idle border and background when no filter is applied", () => {
    expect(classes(false)).toContain("border-border")
    expect(classes(false)).toContain("bg-background")
  })

  it("adds no accent class when no filter is applied", () => {
    expect(classes(false)).not.toContain("border-primary/40")
    expect(classes(false)).not.toContain("bg-primary/5")
  })

  it("keeps the dark mode overrides after the active accent, so dark mode still wins", () => {
    const active = adminColumnFilterTriggerClass(true)

    expect(active).toContain("dark:bg-input/30")
    expect(active.indexOf("dark:bg-input/30")).toBeLessThan(active.indexOf("bg-primary/5"))
  })
})

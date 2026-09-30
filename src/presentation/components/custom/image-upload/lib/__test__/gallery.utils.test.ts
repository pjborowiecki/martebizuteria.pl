import { describe, expect, it } from "vite-plus/test"

import { reorder } from "~/src/presentation/components/custom/image-upload/lib/gallery.utils"

const images = [
  { id: "a", url: "https://assets.test/a.jpg" },
  { id: "b", url: "https://assets.test/b.jpg" },
  { id: "c", url: "https://assets.test/c.jpg" },
]

const ids = (list: readonly { readonly id: string }[]): string[] => list.map((image) => image.id)

describe("reorder", () => {
  it("moves an image forward to the slot it was dropped on", () => {
    expect(ids(reorder(images, "a", "c"))).toStrictEqual(["b", "c", "a"])
  })

  it("moves an image backward to the slot it was dropped on", () => {
    expect(ids(reorder(images, "c", "a"))).toStrictEqual(["c", "a", "b"])
  })

  it("moves an image onto its neighbour", () => {
    expect(ids(reorder(images, "b", "a"))).toStrictEqual(["b", "a", "c"])
  })

  it("keeps the urls attached to the images it moves", () => {
    expect(reorder(images, "a", "c")).toStrictEqual([images[1], images[2], images[0]])
  })

  it("returns the same list when the image is dropped on itself", () => {
    expect(reorder(images, "b", "b")).toBe(images)
  })

  it("returns the same list when the dragged image is unknown", () => {
    expect(reorder(images, "missing", "b")).toBe(images)
  })

  it("returns the same list when the drop target is unknown", () => {
    expect(reorder(images, "a", "missing")).toBe(images)
  })

  it("returns the same empty list when there is nothing to move", () => {
    expect(reorder([], "a", "b")).toStrictEqual([])
  })

  it("leaves the source list untouched", () => {
    reorder(images, "a", "c")

    expect(ids(images)).toStrictEqual(["a", "b", "c"])
  })
})

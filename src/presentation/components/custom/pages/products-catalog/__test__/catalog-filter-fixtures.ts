import { type ProductCategory } from "~/src/modules/product-category/product-category.types"
import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

const EPOCH = new Date("2026-01-01T00:00:00.000Z")

type CategoryWithChildren = ProductCategory["select"] & { readonly children?: readonly ProductCategory["select"][] }

export const categoryFixture = (id: string, title: string, children?: readonly ProductCategory["select"][]): CategoryWithChildren => ({
  createdAt: EPOCH,
  descriptions: null,
  handle: `${id}-handle`,
  id,
  image: null,
  metadata: null,
  parentId: null,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  subtitles: null,
  titles: { "en-US": title, "pl-PL": `${title} PL` },
  updatedAt: EPOCH,
  ...(children === undefined ? {} : { children }),
})

export const collectionFixture = (id: string, title: string): ProductCollection["select"] => ({
  createdAt: EPOCH,
  descriptions: null,
  handle: `${id}-handle`,
  id,
  image: null,
  metadata: null,
  rank: 0,
  status: "active",
  titles: { "en-US": title, "pl-PL": `${title} PL` },
  updatedAt: EPOCH,
})

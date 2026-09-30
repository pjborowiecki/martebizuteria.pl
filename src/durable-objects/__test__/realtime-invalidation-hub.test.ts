import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("cloudflare:workers", () => ({ DurableObject: Object }))

import {
  parseSerializedQueryKeyPrefix,
  queryKeyPrefixesOverlap,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.protocol"

import { toSerializedTopicPrefixes } from "~/src/durable-objects/realtime-invalidation-hub"

describe("toSerializedTopicPrefixes", () => {
  it("serializes each query key prefix as its own topic", () => {
    expect(toSerializedTopicPrefixes([["products"], ["orders", "list"]])).toStrictEqual(['["products"]', '["orders","list"]'])
  })

  it("produces topics the subscriber can parse back into query keys", () => {
    const [topic] = toSerializedTopicPrefixes([["orders", { page: 2 }]])

    expect(parseSerializedQueryKeyPrefix(topic ?? "")).toStrictEqual(["orders", { page: 2 }])
  })

  it("keeps a broader prefix overlapping the narrower keys it should invalidate", () => {
    const [topic] = toSerializedTopicPrefixes([["products"]])
    const parsed = parseSerializedQueryKeyPrefix(topic ?? "")

    expect(parsed).toBeDefined()
    expect(queryKeyPrefixesOverlap(parsed ?? [], ["products", "list", { page: 1 }])).toBe(true)
    expect(queryKeyPrefixesOverlap(parsed ?? [], ["orders"])).toBe(false)
  })

  it("distinguishes two keys that differ only in a later segment", () => {
    expect(
      toSerializedTopicPrefixes([
        ["products", "list"],
        ["products", "detail"],
      ]),
    ).toStrictEqual(['["products","list"]', '["products","detail"]'])
  })

  it("returns nothing to broadcast for an empty set of query keys", () => {
    expect(toSerializedTopicPrefixes([])).toStrictEqual([])
  })
})

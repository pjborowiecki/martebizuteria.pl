import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("cloudflare:workers", () => ({ DurableObject: Object }))

import {
  parseSerializedQueryKeyPrefix,
  resolveInvalidatedQueryKeys,
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

  it("produces a broader topic the subscriber resolves to the narrower subscriptions it covers", () => {
    expect(resolveInvalidatedQueryKeys([["products", "list"], ["orders"]], toSerializedTopicPrefixes([["products"]]))).toStrictEqual([
      ["products", "list"],
    ])
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

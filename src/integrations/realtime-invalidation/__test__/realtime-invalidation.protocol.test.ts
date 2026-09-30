import { describe, expect, it } from "vite-plus/test"

import {
  REALTIME_INVALIDATION_MESSAGE,
  isRealtimeInvalidationPayload,
  parseSerializedQueryKeyPrefix,
  queryKeyPrefixesOverlap,
  serializeQueryKeyPrefix,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.protocol"

describe("query key prefix serialization", () => {
  it.each([[["admin", "products"]], [["admin", "products", { page: 2 }]], [[]]])("round-trips the prefix %j", (queryKey) => {
    expect(parseSerializedQueryKeyPrefix(serializeQueryKeyPrefix(queryKey))).toStrictEqual(queryKey)
  })

  it("keeps the serialized form stable so hub topics can be compared as strings", () => {
    expect(serializeQueryKeyPrefix(["admin", "products"])).toBe('["admin","products"]')
  })

  it.each([["not json"], ['{"admin":true}'], ['"admin"'], ["7"], ["null"], [""]])(
    "reports the non-array payload %j as unusable",
    (serialized) => {
      expect(parseSerializedQueryKeyPrefix(serialized)).toBeUndefined()
    },
  )
})

describe("queryKeyPrefixesOverlap", () => {
  it("matches a broadcast prefix against the longer key of a live query", () => {
    expect(queryKeyPrefixesOverlap(["admin", "products"], ["admin", "products", { page: 2 }])).toBe(true)
  })

  it("matches in either direction because only the shared length is compared", () => {
    expect(queryKeyPrefixesOverlap(["admin", "products", { page: 2 }], ["admin", "products"])).toBe(true)
  })

  it("stops at the first differing segment", () => {
    expect(queryKeyPrefixesOverlap(["admin", "products"], ["admin", "categories"])).toBe(false)
    expect(queryKeyPrefixesOverlap(["storefront", "products"], ["admin", "products"])).toBe(false)
  })

  it("treats an empty prefix as matching everything", () => {
    expect(queryKeyPrefixesOverlap([], ["admin", "products"])).toBe(true)
  })

  it("compares object segments by identity, not by structure", () => {
    const filters = { page: 2 }

    expect(queryKeyPrefixesOverlap(["admin", filters], ["admin", filters])).toBe(true)
    expect(queryKeyPrefixesOverlap(["admin", { page: 2 }], ["admin", { page: 2 }])).toBe(false)
  })
})

describe("isRealtimeInvalidationPayload", () => {
  it("accepts an invalidate message carrying string topics", () => {
    expect(isRealtimeInvalidationPayload({ topics: ['["admin","products"]'], type: REALTIME_INVALIDATION_MESSAGE.INVALIDATE })).toBe(true)
  })

  it("accepts an invalidate message with no topics yet", () => {
    expect(isRealtimeInvalidationPayload({ topics: [], type: "invalidate" })).toBe(true)
  })

  it.each([
    [null],
    [undefined],
    ["invalidate"],
    [{ topics: [] }],
    [{ type: "invalidate" }],
    [{ topics: {}, type: "invalidate" }],
    [{ topics: ["ok", 7], type: "invalidate" }],
    [{ topics: [], type: "refetch" }],
  ])("rejects the malformed frame %j", (data) => {
    expect(isRealtimeInvalidationPayload(data)).toBe(false)
  })
})

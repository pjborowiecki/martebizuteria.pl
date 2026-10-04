import { describe, expect, it } from "vite-plus/test"

import {
  REALTIME_INVALIDATION_MESSAGE,
  isRealtimeInvalidationPayload,
  parseSerializedQueryKeyPrefix,
  resolveInvalidatedQueryKeys,
  serializeQueryKeyPrefix,
  toMinimalQueryKeyPrefixes,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.protocol"

const topicsFor = (...queryKeys: readonly (readonly unknown[])[]): string[] =>
  queryKeys.map((queryKey) => serializeQueryKeyPrefix(queryKey))

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

describe("toMinimalQueryKeyPrefixes", () => {
  it("drops a key that a shorter key in the set already covers", () => {
    expect(toMinimalQueryKeyPrefixes([["products", "storefront-page"], ["products"], ["products", "landing-new-arrivals"]])).toStrictEqual([
      ["products"],
    ])
  })

  it("collapses equal keys into one, in the order they first appear", () => {
    expect(toMinimalQueryKeyPrefixes([["product", "p1"], ["cart"], ["product", "p1"]])).toStrictEqual([["product", "p1"], ["cart"]])
  })

  it("keeps sibling keys that share a parent the set does not name", () => {
    expect(
      toMinimalQueryKeyPrefixes([
        ["admin", "products", "page"],
        ["admin", "products", "stats"],
      ]),
    ).toStrictEqual([
      ["admin", "products", "page"],
      ["admin", "products", "stats"],
    ])
  })

  it("compares object segments by structure, as TanStack Query's filters do", () => {
    expect(
      toMinimalQueryKeyPrefixes([
        ["admin", "products", { page: 2, size: 25 }],
        ["admin", "products", { page: 2, size: 25 }],
        ["admin", "products", { page: 2 }],
      ]),
    ).toStrictEqual([["admin", "products", { page: 2 }]])
  })
})

describe("resolveInvalidatedQueryKeys", () => {
  it("invalidates a topic narrower than its subscription as the topic itself", () => {
    expect(resolveInvalidatedQueryKeys([["product"], ["products"]], topicsFor(["product", "p1"]))).toStrictEqual([["product", "p1"]])
  })

  it("invalidates the subscriptions a broader topic covers", () => {
    expect(
      resolveInvalidatedQueryKeys(
        [
          ["admin", "orders"],
          ["admin", "products"],
          ["storefront", "cart"],
        ],
        topicsFor(["admin"]),
      ),
    ).toStrictEqual([
      ["admin", "orders"],
      ["admin", "products"],
    ])
  })

  it("invalidates a topic equal to its subscription once, even when a nested subscription also matches", () => {
    expect(resolveInvalidatedQueryKeys([["products"], ["products", "storefront-page"]], topicsFor(["products"]))).toStrictEqual([
      ["products"],
    ])
  })

  it("removes duplicate topics and topics another topic in the frame already covers", () => {
    expect(
      resolveInvalidatedQueryKeys(
        [["products"], ["products", "storefront-page"], ["cart", "availability"]],
        topicsFor(["products", "storefront-page"], ["products"], ["cart", "availability"], ["products"]),
      ),
    ).toStrictEqual([["products"], ["cart", "availability"]])
  })

  it("keeps the object segment of a narrower topic", () => {
    expect(resolveInvalidatedQueryKeys([["admin", "products"]], topicsFor(["admin", "products", { page: 2 }]))).toStrictEqual([
      ["admin", "products", { page: 2 }],
    ])
  })

  it("ignores a topic no subscription overlaps", () => {
    expect(resolveInvalidatedQueryKeys([["admin", "orders"]], topicsFor(["admin", "products"], ["storefront"]))).toStrictEqual([])
  })

  it.each([["not json"], ['{"admin":true}'], ['"admin"'], [""]])(
    "ignores the malformed topic %j and keeps the rest of the frame",
    (malformed) => {
      expect(resolveInvalidatedQueryKeys([["admin", "orders"]], [malformed, serializeQueryKeyPrefix(["admin", "orders"])])).toStrictEqual([
        ["admin", "orders"],
      ])
    },
  )
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

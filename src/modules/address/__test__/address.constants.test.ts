import { describe, expect, it } from "vite-plus/test"

import { ADDRESS_MUTATION_KEYS, ADDRESS_QUERY_KEYS } from "~/src/modules/address/address.constants"

describe("address cache keys", () => {
  it("keys the address list under a single root", () => {
    expect(ADDRESS_QUERY_KEYS.ALL).toStrictEqual(["userAddresses"])
  })

  it("namespaces every address mutation under the feature", () => {
    expect(ADDRESS_MUTATION_KEYS.DELETE).toStrictEqual(["address", "deleteUserAddress"])
    expect(ADDRESS_MUTATION_KEYS.SET_DEFAULT).toStrictEqual(["address", "setDefaultUserAddress"])
  })

  it("keeps the two mutations apart so one does not cancel the other", () => {
    expect(ADDRESS_MUTATION_KEYS.DELETE).not.toStrictEqual(ADDRESS_MUTATION_KEYS.SET_DEFAULT)
    expect(ADDRESS_MUTATION_KEYS.DELETE[0]).toBe(ADDRESS_MUTATION_KEYS.SET_DEFAULT[0])
  })
})

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { anonymizeEndedCheckouts } from "~/src/modules/checkout/use-cases/anonymize-ended-checkouts.server"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const DAY_MS = 86_400_000

const NOW = Date.parse("2026-10-10T03:00:00.000Z")

const ENDED_BEFORE = new Date(NOW - 30 * DAY_MS)

const ENDED_LONG_AGO = NOW - 40 * DAY_MS

const ENDED_RECENTLY = NOW - 10 * DAY_MS

const LIMIT = 100

const checkoutRowSchema = z.object({
  billing_address_id: z.string().nullable(),
  billing_company_name: z.string().nullable(),
  billing_nip: z.string().nullable(),
  customer_note: z.string().nullable(),
  email: z.string(),
  locker_id: z.string().nullable(),
  shipping_address_id: z.string().nullable(),
  user_id: z.string().nullable(),
})

const ERASED_CHECKOUT = {
  billing_address_id: null,
  billing_company_name: null,
  billing_nip: null,
  customer_note: null,
  email: "",
  locker_id: null,
  shipping_address_id: null,
  user_id: null,
}

const readCheckout = (id: string) =>
  checkoutRowSchema.parse(
    sqlite
      .prepare(
        "select billing_address_id, billing_company_name, billing_nip, customer_note, email, locker_id, shipping_address_id, user_id from checkout where id = ?",
      )
      .get(id),
  )

const readIds = (table: string): string[] =>
  z
    .array(z.object({ id: z.string() }))
    .parse(sqlite.prepare(`select id from ${table} order by id`).all())
    .map(({ id }) => id)

const readClaimedCheckouts = (): string[] =>
  z
    .array(z.object({ checkout_id: z.string() }))
    .parse(sqlite.prepare("select checkout_id from discount_claim order by checkout_id").all())
    .map(({ checkout_id: checkoutId }) => checkoutId)

const insertGuestCheckout = (id: string, status: string, updatedAt: number): void => {
  sqlite.exec(`
    insert into address (id, address1, city, country_code, first_name, last_name, phone, postal_code) values
      ('${id}-shipping', 'ul. Floriańska 12', 'Kraków', 'PL', 'Ada', 'Nowak', '+48600100200', '31-019'),
      ('${id}-billing', 'ul. Długa 3', 'Gdańsk', 'PL', 'Ada', 'Nowak', '+48600100200', '80-827');
    insert into checkout (id, email, status, shipping_address_id, billing_address_id, customer_note, billing_company_name, billing_nip, locker_id, created_at, updated_at) values
      ('${id}', '${id}@marte.test', '${status}', '${id}-shipping', '${id}-billing', 'Leave it with the neighbour', 'Nowak Studio', '5260250274', 'KRA01M', ${String(updatedAt)}, ${String(updatedAt)});
  `)
}

const insertPayment = (checkoutId: string, status: string): void => {
  sqlite
    .prepare("insert into payment (id, checkout_id, amount, provider, status, transaction_id) values (?, ?, 18900, 'stripe', ?, ?)")
    .run(`${checkoutId}-payment`, checkoutId, status, `cs_${checkoutId}`)
}

const anonymize = () => anonymizeEndedCheckouts({ endedBefore: ENDED_BEFORE, limit: LIMIT })

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into user (id, name, email) values ('user-ada', 'Ada Nowak', 'ada@marte.test');
    insert into discount (id, code, type, value) values ('discount-welcome', 'WELCOME', 'percentage', 10);
  `)
})

beforeEach(() => {
  sqlite.exec(`
    delete from "order";
    delete from discount_claim;
    delete from payment;
    delete from checkout;
    delete from address;
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("anonymizeEndedCheckouts on the migrated schema", () => {
  it("erases the contact details of a checkout whose payment failed more than 30 days ago and deletes its addresses", async () => {
    insertGuestCheckout("failed", "failed", ENDED_LONG_AGO)
    insertPayment("failed", "failed")

    await expect(anonymize()).resolves.toBe(1)

    expect(readCheckout("failed")).toStrictEqual(ERASED_CHECKOUT)
    expect(readIds("address")).toStrictEqual([])
  })

  it("keeps the payment of an anonymised checkout", async () => {
    insertGuestCheckout("failed", "failed", ENDED_LONG_AGO)
    insertPayment("failed", "failed")

    await anonymize()

    expect(readIds("payment")).toStrictEqual(["failed-payment"])
  })

  it("anonymises an abandoned checkout the same way", async () => {
    insertGuestCheckout("abandoned", "abandoned", ENDED_LONG_AGO)

    await expect(anonymize()).resolves.toBe(1)

    expect(readCheckout("abandoned")).toStrictEqual(ERASED_CHECKOUT)
  })

  it("anonymises a checkout that never opened a payment and releases the discount it still held", async () => {
    insertGuestCheckout("never-paid", "pending", ENDED_LONG_AGO)
    sqlite.exec(
      "insert into discount_claim (id, checkout_id, discount_id, email) values ('claim-never-paid', 'never-paid', 'discount-welcome', 'never-paid@marte.test')",
    )

    await expect(anonymize()).resolves.toBe(1)

    expect(readCheckout("never-paid")).toStrictEqual(ERASED_CHECKOUT)
    expect(readClaimedCheckouts()).toStrictEqual([])
  })

  it("unlinks a signed-in customer's checkout from the account and leaves the address saved to it", async () => {
    sqlite.exec(`
      insert into address (id, address1, city, country_code, user_id, is_default) values ('address-saved', 'ul. Szeroka 1', 'Toruń', 'PL', 'user-ada', 1);
      insert into checkout (id, email, status, user_id, shipping_address_id, billing_address_id, updated_at) values
        ('signed-in', 'ada@marte.test', 'failed', 'user-ada', 'address-saved', 'address-saved', ${String(ENDED_LONG_AGO)});
    `)

    await expect(anonymize()).resolves.toBe(1)

    expect(readCheckout("signed-in")).toStrictEqual(ERASED_CHECKOUT)
    expect(readIds("address")).toStrictEqual(["address-saved"])
  })

  it("leaves a checkout that ended less than 30 days ago untouched", async () => {
    insertGuestCheckout("recent", "failed", ENDED_RECENTLY)

    await expect(anonymize()).resolves.toBe(0)

    expect(readCheckout("recent").email).toBe("recent@marte.test")
    expect(readIds("address")).toStrictEqual(["recent-billing", "recent-shipping"])
  })

  it("leaves an open checkout and its payment alone however old they are", async () => {
    insertGuestCheckout("open", "pending", ENDED_LONG_AGO)
    insertPayment("open", "pending")
    sqlite.exec(
      "insert into discount_claim (id, checkout_id, discount_id, email) values ('claim-open', 'open', 'discount-welcome', 'open@marte.test')",
    )

    await expect(anonymize()).resolves.toBe(0)

    expect(readCheckout("open").email).toBe("open@marte.test")
    expect(readIds("address")).toStrictEqual(["open-billing", "open-shipping"])
    expect(readClaimedCheckouts()).toStrictEqual(["open"])
  })

  it("leaves the checkout of a paid order alone however old it is", async () => {
    insertGuestCheckout("paid", "completed", ENDED_LONG_AGO)
    insertPayment("paid", "succeeded")
    sqlite.exec(`
      insert into "order" (id, checkout_id, payment_id, email, order_number, status, fulfillment_status, total) values
        ('order-paid', 'paid', 'paid-payment', 'paid@marte.test', 'MRT-2026-00001', 'completed', 'delivered', 18900);
    `)

    await expect(anonymize()).resolves.toBe(0)

    expect(readCheckout("paid").email).toBe("paid@marte.test")
    expect(readIds("address")).toStrictEqual(["paid-billing", "paid-shipping"])
    expect(readIds('"order"')).toStrictEqual(["order-paid"])
  })

  it("does nothing the second time, so a full batch always means more checkouts are waiting", async () => {
    insertGuestCheckout("failed", "failed", ENDED_LONG_AGO)
    await anonymize()

    await expect(anonymize()).resolves.toBe(0)
  })

  it("anonymises at most the batch size at a time", async () => {
    for (const id of ["first", "second", "third"]) {
      insertGuestCheckout(id, "failed", ENDED_LONG_AGO)
    }

    await expect(anonymizeEndedCheckouts({ endedBefore: ENDED_BEFORE, limit: 2 })).resolves.toBe(2)
    await expect(anonymizeEndedCheckouts({ endedBefore: ENDED_BEFORE, limit: 2 })).resolves.toBe(1)
    expect(readIds("address")).toStrictEqual([])
  })

  it("names a full batch of checkouts in one bound value, inside D1's limit of 100", async () => {
    for (let index = 0; index < 150; index += 1) {
      insertGuestCheckout(`bulk-${String(index).padStart(3, "0")}`, "failed", ENDED_LONG_AGO)
    }

    await expect(anonymizeEndedCheckouts({ endedBefore: ENDED_BEFORE, limit: 150 })).resolves.toBe(150)
    expect(readIds("address")).toStrictEqual([])
  })
})

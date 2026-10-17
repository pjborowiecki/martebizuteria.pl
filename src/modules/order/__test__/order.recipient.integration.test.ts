import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

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

const { getAdminOrderDetailRow, getOrderForProgressEmail, getOrderForRefundEmail, getOrderForShippedEmail, getOrderTotalsForEmail } =
  await import("~/src/modules/order/order.accessors")

const placeOrder = (id: string, email: string, userId: string | null): void => {
  sqlite.prepare(`insert into "order" (id, email, order_number, user_id) values (?, ?, ?, ?)`).run(id, email, `MRT-${id}`, userId)
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into user (id, name, email, created_at, updated_at) values
      ('anna', 'Anna', 'anna@old.example', 0, 0),
      ('ewa', 'Ewa', 'ewa@example.test', 0, 0);
    update user set email = 'anna@new.example' where id = 'anna';
    update user set email = 'ewa@new.example' where id = 'ewa';
    update user set email = 'ewa@example.test' where id = 'ewa';
  `)
})

beforeEach(() => {
  sqlite.exec(`delete from "order"`)
})

afterAll(() => {
  sqlite.close()
})

describe("where an order's e-mails go", () => {
  it.each([
    { email: "Anna@Old.example", name: "the address its account has replaced", recipient: "anna@new.example", userId: "anna" },
    { email: "gift@example.test", name: "an address its account never used", recipient: "gift@example.test", userId: "anna" },
    { email: "ewa@example.test", name: "the address its account came back to", recipient: "ewa@example.test", userId: "ewa" },
    {
      email: "anna@old.example",
      name: "an address an account replaced, but placed as a guest",
      recipient: "anna@old.example",
      userId: null,
    },
  ])("sends an order placed with $name to $recipient, and keeps the address on the order", async ({ email, recipient, userId }) => {
    placeOrder("order-1", email, userId)

    for (const read of [getOrderTotalsForEmail, getOrderForShippedEmail, getOrderForProgressEmail, getOrderForRefundEmail]) {
      await expect(read("order-1")).resolves.toMatchObject({ email, recipient })
    }
  })

  it("names the account's current address and the recipient on the admin order", async () => {
    placeOrder("order-1", "anna@old.example", "anna")

    await expect(getAdminOrderDetailRow("order-1")).resolves.toMatchObject({
      email: "anna@old.example",
      recipient: "anna@new.example",
      user: { email: "anna@new.example" },
    })
  })
})

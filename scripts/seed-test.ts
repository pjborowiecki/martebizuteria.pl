import { hashPassword } from "better-auth/crypto"
import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { TEST_ACCOUNTS, TEST_PASSWORD } from "~/e2e/data/accounts"

const CATALOG_SEEDS = [
  "delivery-methods",
  "product-categories",
  "product-collections",
  "product-attributes",
  "products",
  "product-variants",
  "inventory",
  "product-images",
  "category-on-product",
  "collection-on-product",
  "attribute-on-product",
]

const literal = (value: string): string => `'${value.replaceAll("'", "''")}'`

const password = await hashPassword(TEST_PASSWORD)
const accountStatements = Object.values(TEST_ACCOUNTS).flatMap(({ email, id, name, role }) => [
  `INSERT INTO user (id, email, name, role, email_verified) VALUES (${literal(id)}, ${literal(email)}, ${literal(name)}, ${literal(role)}, 1) ON CONFLICT(id) DO UPDATE SET email_verified = 1, role = excluded.role;`,
  `INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES (${literal(`${id}-credential`)}, ${literal(id)}, 'credential', ${literal(id)}, ${literal(password)}) ON CONFLICT(id) DO UPDATE SET password = excluded.password;`,
])
const catalogStatements = await Promise.all(CATALOG_SEEDS.map((name) => readFile(`src/integrations/drizzle-orm/seeds/${name}.sql`, "utf8")))

const directory = await mkdtemp(join(tmpdir(), "marte-test-seed-"))
try {
  const file = join(directory, "seed.sql")
  await writeFile(file, [...catalogStatements, ...accountStatements].join("\n"))
  const result = spawnSync(
    "bun",
    ["x", "wrangler", "d1", "execute", "DB", "--env", "test", "--local", "--persist-to", ".wrangler/test", "--file", file],
    { stdio: "inherit" },
  )
  if (result.status !== 0) {
    throw new Error("Could not seed the local test database")
  }
} finally {
  await rm(directory, { recursive: true })
}

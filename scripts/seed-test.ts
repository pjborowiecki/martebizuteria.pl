import { hashPassword, symmetricEncrypt } from "better-auth/crypto"
import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parseEnv } from "node:util"

import { ADMIN_TOTP_SECRET, TEST_ACCOUNTS, TEST_PASSWORD } from "~/e2e/data/accounts"

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
const authSecret = parseEnv(await readFile(".env.test", "utf8"))["AUTH_SECRET"]
if (authSecret === undefined) {
  throw new Error("Missing AUTH_SECRET in .env.test, which the test Worker decrypts the admin's two-factor secret with")
}

const encryptForTestWorker = (data: string): Promise<string> => symmetricEncrypt({ data, key: authSecret })
const adminTwoFactorStatements = [
  `UPDATE user SET two_factor_enabled = 1 WHERE id = ${literal(TEST_ACCOUNTS.admin.id)};`,
  `INSERT INTO two_factor (id, secret, backup_codes, user_id) VALUES (${literal(`${TEST_ACCOUNTS.admin.id}-two-factor`)}, ${literal(await encryptForTestWorker(ADMIN_TOTP_SECRET))}, ${literal(await encryptForTestWorker("[]"))}, ${literal(TEST_ACCOUNTS.admin.id)}) ON CONFLICT(id) DO UPDATE SET secret = excluded.secret, backup_codes = excluded.backup_codes;`,
]
const customerTimeZoneStatement = `UPDATE user SET timezone = 'Europe/Warsaw' WHERE id = ${literal(TEST_ACCOUNTS.customer.id)};`
const catalogStatements = await Promise.all(CATALOG_SEEDS.map((name) => readFile(`src/integrations/drizzle-orm/seeds/${name}.sql`, "utf8")))

const directory = await mkdtemp(join(tmpdir(), "marte-test-seed-"))
try {
  const file = join(directory, "seed.sql")
  await writeFile(file, [...catalogStatements, ...accountStatements, ...adminTwoFactorStatements, customerTimeZoneStatement].join("\n"))
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

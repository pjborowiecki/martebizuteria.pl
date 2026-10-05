import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { parseEnv } from "node:util"

import { verifyStripeKeys } from "~/src/integrations/stripe/stripe.keys"

const environment = process.argv[2]
if (environment !== "development" && environment !== "preview" && environment !== "production") {
  throw new Error("Expected development, preview or production")
}

const file = `.env.${environment}`
const values = existsSync(file) ? parseEnv(await readFile(file, "utf8")) : {}
const setting = (name: string): string | undefined => process.env[name] ?? values[name]

const result = verifyStripeKeys({
  environment,
  publishableKey: setting("VITE_STRIPE_PUBLISHABLE_KEY"),
  secretKey: setting("STRIPE_SECRET_KEY"),
})
process.stdout.write(`${result}\n`)

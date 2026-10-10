import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { parseEnv } from "node:util"

import { verifyTurnstileKeys } from "~/src/integrations/cloudflare-turnstile/turnstile.keys"

const environment = process.argv[2]
if (environment !== "development" && environment !== "preview" && environment !== "production") {
  throw new Error("Expected development, preview or production")
}

const file = `.env.${environment}`
const values = existsSync(file) ? parseEnv(await readFile(file, "utf8")) : {}
const setting = (name: string): string | undefined => process.env[name] ?? values[name]

const result = verifyTurnstileKeys({
  environment,
  secretKey: setting("TURNSTILE_SECRET_KEY"),
  siteKey: setting("VITE_TURNSTILE_SITE_KEY"),
})
process.stdout.write(`${result}\n`)

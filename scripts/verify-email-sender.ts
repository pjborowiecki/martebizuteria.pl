import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { parseEnv } from "node:util"

import { verifyEmailSender } from "~/src/integrations/resend/resend.sender"

const environment = process.argv[2]
if (environment !== "development" && environment !== "preview" && environment !== "production") {
  throw new Error("Expected development, preview or production")
}

const file = `.env.${environment}`
const values = existsSync(file) ? parseEnv(await readFile(file, "utf8")) : {}
const setting = (name: string): string | undefined => process.env[name] ?? values[name]

const result = await verifyEmailSender({
  apiKey: setting("RESEND_API_KEY"),
  environment,
  from: setting("RESEND_EMAIL_FROM"),
  managementApiKey: setting("RESEND_MANAGEMENT_API_KEY"),
})
process.stdout.write(`${result}\n`)

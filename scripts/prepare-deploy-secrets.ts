import { mkdir, readFile, writeFile } from "node:fs/promises"
import { parseEnv } from "node:util"

import { unstable_readConfig } from "wrangler"

const environment = process.argv[2]
if (environment !== "preview" && environment !== "production") {
  throw new Error("Expected preview or production")
}

const config = unstable_readConfig({ config: "wrangler.jsonc", env: environment })
const values = parseEnv(await readFile(`.env.${environment}`, "utf8"))
const secrets: Record<string, string> = {}
for (const name of config.secrets?.required ?? []) {
  const value = process.env[name] ?? values[name]
  if (!value?.trim()) {
    throw new Error(`Missing ${name} in .env.${environment} or the process environment`)
  }
  secrets[name] = value
}

// Only declared Worker bindings are uploaded; Cloudflare management tokens stay local.
await mkdir(".wrangler", { recursive: true })
await writeFile(`.wrangler/secrets.${environment}.json`, JSON.stringify(secrets), { mode: 0o600 })
process.stdout.write(`Prepared ${environment} Worker secrets without management credentials.\n`)

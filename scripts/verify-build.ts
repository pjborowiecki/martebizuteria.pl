import { access, readdir, readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"

const environment = process.argv[2]
if (environment !== "preview" && environment !== "production") {
  throw new Error("Expected preview or production")
}

const deploymentPath = ".wrangler/deploy/config.json"
const deployment = JSON.parse(await readFile(deploymentPath, "utf8")) as { configPath: string }
const configPath = resolve(dirname(deploymentPath), deployment.configPath)
if (configPath !== resolve("dist/server/wrangler.json")) {
  throw new Error("Worker deployment points outside the current server build")
}

const config = JSON.parse(await readFile(configPath, "utf8")) as {
  assets: { directory: string }
  main: string
  name: string
  vars: { APP_ENV: string }
}
if (
  config.vars.APP_ENV !== environment ||
  config.name !== (environment === "production" ? "martebizuteria" : "martebizuteria-preview")
) {
  throw new Error(`Worker build does not target ${environment}`)
}
await access(resolve(dirname(configPath), config.main))
if (resolve(dirname(configPath), config.assets.directory) !== resolve("dist/client")) {
  throw new Error("Worker assets point outside the current client build")
}
await access("dist/client/fonts")

const clientAssets = await readdir("dist/client/assets")
if (!clientAssets.some((name) => name.endsWith(".js"))) {
  throw new Error("Missing client JavaScript")
}
if (!clientAssets.some((name) => name.endsWith(".css"))) {
  throw new Error("Missing client CSS")
}

const scanner = new Bun.Transpiler({ loader: "js" })
for (const file of clientAssets.filter((name) => name.endsWith(".js"))) {
  const { imports } = scanner.scan(await readFile(join("dist/client/assets", file), "utf8"))
  if (imports.some(({ path }) => path === "cloudflare:workers" || path.startsWith("node:"))) {
    throw new Error(`Server-only import in client asset: ${file}`)
  }
}
process.stdout.write(`Verified ${environment} Worker deployment, fonts, CSS, and client JavaScript.\n`)

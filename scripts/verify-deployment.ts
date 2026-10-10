import { verifyDeployment } from "~/src/lib/deployment"

const environment = process.argv[2]
if (environment !== "preview" && environment !== "production") {
  throw new Error("Expected preview or production")
}

process.stdout.write(`${await verifyDeployment(environment)}\n`)

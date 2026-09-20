import { unstable_readConfig } from "wrangler"

const environment = process.argv[2]
if (environment !== "preview" && environment !== "production") {
  throw new Error("Expected preview or production")
}

const config = unstable_readConfig({ config: "wrangler.jsonc", env: environment })
const database = config.d1_databases.find(({ binding }) => binding === "DB")
const cache = config.kv_namespaces.find(({ binding }) => binding === "CACHE")
const images = config.r2_buckets.find(({ binding }) => binding === "IMAGES")
const audit = config.queues.producers.find(({ binding }) => binding === "AUDIT_LOG_QUEUE")
const realtime = config.durable_objects.bindings.find(({ name }) => name === "REALTIME_INVALIDATION_HUB")

if (
  !database?.database_id ||
  /^[0-]+$/u.test(database.database_id) ||
  !cache?.id ||
  /^[0-]+$/u.test(cache.id) ||
  !images?.bucket_name ||
  !audit?.queue ||
  !config.queues.consumers.some(({ queue }) => queue === audit.queue) ||
  realtime?.class_name !== "RealtimeInvalidationHub"
) {
  throw new Error(`Missing database, cache, images, audit, or realtime binding for ${environment}`)
}

process.stdout.write(`Verified ${environment} Worker bindings.\n`)

import { describe, expect, it } from "vite-plus/test"
import { unstable_readConfig } from "wrangler"
import { z } from "zod"

import { type StripeAppEnv, foreignStripeDeployment, stripeDeploymentOf } from "~/src/integrations/stripe/stripe.deployment"

const APP_ENVS: readonly StripeAppEnv[] = ["development", "preview", "production", "test"]

const d1BindingSchema = z.object({ binding: z.string(), database_name: z.string() })

const workerConfigSchema = z.object({
  d1_databases: z.array(d1BindingSchema),
  vars: z.object({ APP_ENV: z.string() }),
})

const readWorkerConfig = (environment: string): unknown => unstable_readConfig({ config: "wrangler.jsonc", env: environment })

const readWorkerDatabase = (appEnv: StripeAppEnv) => {
  const config = workerConfigSchema.parse(readWorkerConfig(appEnv))

  return { appEnv: config.vars.APP_ENV, database: config.d1_databases.find(({ binding }) => binding === "DB")?.database_name }
}

const sessionStampedBy = (deployment: string | undefined) => ({
  metadata: deployment === undefined ? { checkoutId: "checkout-1" } : { checkoutId: "checkout-1", deployment },
  object: "checkout.session",
})

describe("stripeDeploymentOf", () => {
  it.each(APP_ENVS)("names the %s Worker by the D1 database that keeps its checkouts", (appEnv) => {
    expect(readWorkerDatabase(appEnv)).toStrictEqual({ appEnv, database: stripeDeploymentOf(appEnv) })
  })

  it("gives development and preview one name, since a local checkout writes to the preview database", () => {
    expect(stripeDeploymentOf("development")).toBe(stripeDeploymentOf("preview"))
  })

  it("keeps local test runs apart from preview and production apart from both", () => {
    expect(new Set([stripeDeploymentOf("preview"), stripeDeploymentOf("test"), stripeDeploymentOf("production")]).size).toBe(3)
  })
})

describe("foreignStripeDeployment", () => {
  it("names the deployment of a session a local test run created when preview receives its event", () => {
    expect(foreignStripeDeployment(sessionStampedBy("martebizuteria-test"), "preview")).toBe("martebizuteria-test")
  })

  it("claims a session this deployment created", () => {
    expect(foreignStripeDeployment(sessionStampedBy("martebizuteria-preview"), "preview")).toBeUndefined()
  })

  it("claims a session a local development server created against the preview database", () => {
    expect(foreignStripeDeployment(sessionStampedBy("martebizuteria-preview"), "development")).toBeUndefined()
  })

  it("claims a session created before sessions were stamped", () => {
    expect(foreignStripeDeployment(sessionStampedBy(undefined), "preview")).toBeUndefined()
  })

  it.each([
    { label: "null metadata", stripeObject: { metadata: null, object: "checkout.session" } },
    { label: "no metadata at all", stripeObject: { object: "dispute" } },
  ])("claims an object with $label", ({ stripeObject }) => {
    expect(foreignStripeDeployment(stripeObject, "production")).toBeUndefined()
  })
})

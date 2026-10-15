import zod from "zod/v4"

const STRIPE_DEPLOYMENT_BY_APP_ENV = {
  development: "martebizuteria-preview",
  preview: "martebizuteria-preview",
  production: "martebizuteria",
  test: "martebizuteria-test",
} as const

const stripeDeploymentMetadataSchema = zod.object({
  metadata: zod.object({ deployment: zod.string().optional() }).nullish(),
})

export const stripeDeploymentOf = (appEnv: StripeAppEnv): string => STRIPE_DEPLOYMENT_BY_APP_ENV[appEnv]

export const foreignStripeDeployment = (stripeObject: unknown, appEnv: StripeAppEnv): string | undefined => {
  const deployment = stripeDeploymentMetadataSchema.parse(stripeObject).metadata?.deployment

  return deployment === stripeDeploymentOf(appEnv) ? undefined : deployment
}

export type StripeAppEnv = keyof typeof STRIPE_DEPLOYMENT_BY_APP_ENV

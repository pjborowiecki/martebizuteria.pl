import { createServerFn } from "@tanstack/react-start";

import { createCheckoutSessionInputSchema, updateCheckoutSessionInputSchema } from "~/src/integrations/stripe/stripe.actions.schemas";

const createCheckoutSessionFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createCheckoutSessionInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { handleCreateCheckoutSession } = await import("~/src/integrations/stripe/stripe.actions.server");
    return handleCreateCheckoutSession(data);
  });

const updateCheckoutSessionFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateCheckoutSessionInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { handleUpdateCheckoutSession } = await import("~/src/integrations/stripe/stripe.actions.server");
    return handleUpdateCheckoutSession(data);
  });

export const stripeActions = {
  createCheckoutSessionFn,
  updateCheckoutSessionFn
};

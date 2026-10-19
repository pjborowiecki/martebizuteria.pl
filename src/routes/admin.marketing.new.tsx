import { createFileRoute } from "@tanstack/react-router"

import { getNewsletterStatsQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-stats"

import { NewsletterComposer } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-composer"

export const Route = createFileRoute("/admin/marketing/new")({
  component: NewsletterComposer,
  loader: async ({ context }) => {
    await context.queryClient.query(getNewsletterStatsQuery())
  },
})

import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/forms/formularz_zwrotu.pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const [{ respondWithForm }, { WITHDRAWAL_FORM }] = await Promise.all([
          import("~/src/modules/content-page/use-cases/respond-with-form.server"),
          import("~/src/presentation/pdf/withdrawal-form"),
        ])

        return respondWithForm(request, WITHDRAWAL_FORM)
      },
    },
  },
})

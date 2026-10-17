import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/forms/formularz_reklamacji.pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const [{ respondWithForm }, { COMPLAINT_FORM }] = await Promise.all([
          import("~/src/modules/content-page/content-page.forms.server"),
          import("~/src/presentation/pdf/complaint-form"),
        ])

        return respondWithForm(request, COMPLAINT_FORM)
      },
    },
  },
})

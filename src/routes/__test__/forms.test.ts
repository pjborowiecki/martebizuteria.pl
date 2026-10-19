import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type FormTemplate } from "~/src/presentation/pdf/form-document"

interface RouteDefinition {
  readonly server: {
    readonly handlers: {
      readonly GET: (context: { readonly request: Request }) => Promise<Response>
    }
  }
}

const { respondWithForm, routes } = vi.hoisted(() => ({
  respondWithForm: vi.fn<(request: Request, form: FormTemplate) => Promise<Response>>(),
  routes: new Map<string, RouteDefinition>(),
}))

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: RouteDefinition) => {
    routes.set(path, options)

    return options
  },
}))
vi.mock("~/src/modules/content-page/use-cases/respond-with-form.server", () => ({ respondWithForm }))

await import("~/src/routes/forms.formularz_zwrotu[.]pdf")
await import("~/src/routes/forms.formularz_reklamacji[.]pdf")

const { COMPLAINT_FORM } = await import("~/src/presentation/pdf/complaint-form")
const { WITHDRAWAL_FORM } = await import("~/src/presentation/pdf/withdrawal-form")

beforeEach(() => {
  respondWithForm.mockReset()
})

describe("PDF form routes", () => {
  it.each([
    { form: WITHDRAWAL_FORM, path: "/forms/formularz_zwrotu.pdf" },
    { form: COMPLAINT_FORM, path: "/forms/formularz_reklamacji.pdf" },
  ])("serves $path at the address the legal pages and e-mails link to", async ({ form, path }) => {
    const request = new Request(`https://martebizuteria.pl${path}`)
    const response = new Response("%PDF-")
    respondWithForm.mockResolvedValue(response)

    await expect(routes.get(path)?.server.handlers.GET({ request })).resolves.toBe(response)
    expect(respondWithForm).toHaveBeenCalledExactlyOnceWith(request, form)
  })
})

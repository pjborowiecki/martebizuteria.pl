import { type Page, type Request } from "@playwright/test"
import { createHash } from "node:crypto"

const SERVER_FUNCTION_PATH = "/_serverFn/"

const serverFunctionId = (file: string, name: string): string =>
  createHash("sha256").update(`${file}--${name}_createServerFn_handler`).digest("hex")

export const SERVER_FUNCTIONS = {
  checkCartAvailability: serverFunctionId("src/modules/cart/use-cases/check-cart-availability.ts", "checkCartAvailability"),
  getCollections: serverFunctionId("src/modules/product-collection/use-cases/get-collections.ts", "getCollections"),
  getCurrentSession: serverFunctionId("src/integrations/better-auth/auth.session.ts", "getCurrentSession"),
} as const

const calledServerFunction = (url: string): string | undefined => {
  const { pathname } = new URL(url)

  return pathname.startsWith(SERVER_FUNCTION_PATH) ? pathname.slice(SERVER_FUNCTION_PATH.length) : undefined
}

export const recordServerFunctionCalls = (page: Page): ((documentPath: string) => Promise<string[]>) => {
  const calls: { readonly id: string; readonly request: Request }[] = []
  page.on("request", (request) => {
    const id = calledServerFunction(request.url())
    if (id !== undefined) {
      calls.push({ id, request })
    }
  })

  return async (documentPath) => {
    const referers = await Promise.all(calls.map(({ request }) => request.headerValue("referer")))

    return calls
      .filter((_call, index) => {
        const referer = referers[index]

        return typeof referer === "string" && new URL(referer).pathname === documentPath
      })
      .map(({ id }) => id)
  }
}

import { type Page, type Request, type Response } from "@playwright/test"
import { createHash } from "node:crypto"

const SERVER_FUNCTION_PATH = "/_serverFn/"

const serverFunctionId = (file: string, name: string): string =>
  createHash("sha256").update(`${file}--${name}_createServerFn_handler`).digest("hex")

export const SERVER_FUNCTIONS = {
  checkCartAvailability: serverFunctionId("src/modules/cart/use-cases/check-cart-availability.ts", "checkCartAvailability"),
  createCheckoutSession: serverFunctionId("src/integrations/stripe/stripe.actions.ts", "createCheckoutSessionFn"),
  getAdminOrdersPage: serverFunctionId("src/modules/order/use-cases/get-admin-orders-page.ts", "getAdminOrdersPage"),
  getAdminProducts: serverFunctionId("src/modules/product/use-cases/get-admin-products.ts", "getAdminProducts"),
  getCollections: serverFunctionId("src/modules/product-collection/use-cases/get-collections.ts", "getCollections"),
  getCurrentSession: serverFunctionId("src/integrations/better-auth/auth.session.ts", "getCurrentSession"),
  getStorefrontProductsPage: serverFunctionId("src/modules/product/use-cases/get-storefront-products-page.ts", "getStorefrontProductsPage"),
  updateCheckoutSession: serverFunctionId("src/integrations/stripe/stripe.actions.ts", "updateCheckoutSessionFn"),
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

export const recordServerFunctionRequests = (page: Page, id: string): readonly Request[] => {
  const requests: Request[] = []
  page.on("request", (request) => {
    if (calledServerFunction(request.url()) === id) {
      requests.push(request)
    }
  })

  return requests
}

export const waitForServerFunctionResponse = (page: Page, id: string): Promise<Response> =>
  page.waitForResponse((response) => calledServerFunction(response.url()) === id)

export const rewriteNextServerFunctionRequest = async (page: Page, id: string, rewrite: (body: string) => string): Promise<void> => {
  await page.route(
    (url) => calledServerFunction(url.href) === id,
    async (route) => {
      const body = route.request().postData()
      await route.continue(body === null ? undefined : { postData: rewrite(body) })
    },
    { times: 1 },
  )
}

export const runBeforeServerFunction = async (page: Page, id: string, run: () => Promise<void>): Promise<void> => {
  await page.route(
    (url) => calledServerFunction(url.href) === id,
    async (route) => {
      await run()
      await route.continue()
    },
    { times: 1 },
  )
}

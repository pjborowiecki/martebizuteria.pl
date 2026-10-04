import { parseSetCookieHeader } from "better-auth/cookies"

import { auth } from "~/src/integrations/better-auth/auth.server"

export const AUTH_BASE_URL = "http://localhost:3000/api/auth"

export const CUSTOMER_PASSWORD = "correct-horse-battery-staple"

export interface AuthBrowser {
  readonly follow: (url: string) => Promise<Response>
  readonly post: (path: string, body: Readonly<Record<string, unknown>>) => Promise<Response>
  readonly signIn: (email: string) => Promise<Response>
}

export const openAuthBrowser = (ip: string): AuthBrowser => {
  const jar = new Map<string, string>()

  const send = async (
    url: string,
    init: Readonly<{ body?: string; headers?: Record<string, string>; method?: string }>,
  ): Promise<Response> => {
    const response = await auth.handler(
      new Request(url, {
        ...init,
        headers: {
          ...init.headers,
          "cf-connecting-ip": ip,
          cookie: [...jar].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("; "),
          origin: new URL(AUTH_BASE_URL).origin,
        },
      }),
    )
    for (const [name, { value }] of parseSetCookieHeader(response.headers.getSetCookie().join(", "))) {
      if (value === "") {
        jar.delete(name)
      } else {
        jar.set(name, value)
      }
    }

    return response
  }

  const post: AuthBrowser["post"] = (path, body) =>
    send(`${AUTH_BASE_URL}${path}`, { body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, method: "POST" })

  return {
    follow: (url) => send(url, {}),
    post,
    signIn: (email) => post("/sign-in/email", { email, password: CUSTOMER_PASSWORD }),
  }
}

export const createPasswordCustomer = async (email: string): Promise<string> => {
  const context = await auth.$context
  const customer = await context.internalAdapter.createUser({ email, emailVerified: true, name: "Ada" }, { method: "email-password" })
  await context.internalAdapter.linkAccount({
    accountId: customer.id,
    password: await context.password.hash(CUSTOMER_PASSWORD),
    providerId: "credential",
    userId: customer.id,
  })

  return customer.id
}

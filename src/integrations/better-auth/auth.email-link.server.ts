import { APIError } from "better-auth/api"
import { verifyJWT } from "better-auth/crypto"

import { EMAIL_ADDRESS_TAKEN, EMAIL_LINK_SUPERSEDED } from "~/src/integrations/better-auth/auth.constants"
import { type AuthRefusal } from "~/src/integrations/better-auth/auth.errors"
import { emailLinkSchema } from "~/src/integrations/better-auth/auth.zod"

import { getCurrentAddressHolder } from "~/src/modules/user-email-history/user-email-history.accessors"

const LOCAL_PATH = /^\/(?![/\\])/u

const MS_PER_SECOND = 1000

export const readLinkPayload = ({ context, query }: Readonly<EmailLinkRequest>): Promise<unknown> =>
  verifyJWT(String(query?.["token"]), context.secret)

const refusal = ({ query, redirect }: Readonly<EmailLinkRequest>, refused: AuthRefusal): unknown => {
  const callbackURL = query?.["callbackURL"]

  return typeof callbackURL === "string" && LOCAL_PATH.test(callbackURL)
    ? redirect(`${callbackURL}${callbackURL.includes("?") ? "&" : "?"}error=${refused.code}`)
    : APIError.from("UNAUTHORIZED", refused)
}

export const refuseSupersededEmailLink = async (request: Readonly<EmailLinkRequest>): Promise<void> => {
  const link = emailLinkSchema.safeParse(await readLinkPayload(request)).data
  const holder = link === undefined ? undefined : await getCurrentAddressHolder(link.email)
  if (link === undefined || holder === undefined) {
    return
  }

  if (Math.floor(holder.addedAt.getTime() / MS_PER_SECOND) > link.iat) {
    throw refusal(request, EMAIL_LINK_SUPERSEDED)
  }

  const taken = link.updateTo === undefined ? undefined : await getCurrentAddressHolder(link.updateTo)
  if (taken !== undefined && taken.userId !== holder.userId) {
    throw refusal(request, EMAIL_ADDRESS_TAKEN)
  }
}

export interface EmailLinkRequest {
  readonly context: { readonly secret: string }
  readonly query?: Record<string, unknown> | undefined
  readonly redirect: (url: string) => unknown
}

import { type JSX, useEffect, useRef } from "react"

import { type UseMutationResult } from "@tanstack/react-query"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const titleKey = (result: Newsletter["tokenResult"]["result"] | undefined): "alreadyTitle" | "invalidTitle" | "okTitle" => {
  if (result === NEWSLETTER_TOKEN_RESULT.OK) {
    return "okTitle"
  }

  return result === NEWSLETTER_TOKEN_RESULT.ALREADY_DONE ? "alreadyTitle" : "invalidTitle"
}

const descriptionKey = (
  result: Newsletter["tokenResult"]["result"] | undefined,
): "alreadyDescription" | "invalidDescription" | "okDescription" => {
  if (result === NEWSLETTER_TOKEN_RESULT.OK) {
    return "okDescription"
  }

  return result === NEWSLETTER_TOKEN_RESULT.ALREADY_DONE ? "alreadyDescription" : "invalidDescription"
}

export const NewsletterTokenPage = ({ mutation, namespace, token }: Readonly<NewsletterTokenPageProps>): JSX.Element => {
  const t = useTranslations(namespace)
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current || token === undefined) {
      return
    }
    requested.current = true
    mutation.mutate({ token })
  }, [mutation, token])

  const result = token === undefined ? NEWSLETTER_TOKEN_RESULT.INVALID : mutation.data?.result
  const email = mutation.data?.email ?? ""
  const settled = result !== undefined || mutation.isError

  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-xl flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      {settled ? (
        <>
          {result === NEWSLETTER_TOKEN_RESULT.OK || result === NEWSLETTER_TOKEN_RESULT.ALREADY_DONE ? (
            <CheckCircle2 className="size-14 text-success" strokeWidth={1} />
          ) : (
            <XCircle className="size-14 text-muted-foreground/40" strokeWidth={1} />
          )}
          <h1 className="font-serif text-3xl md:text-4xl">{t(titleKey(result))}</h1>
          <p className="max-w-md text-sm text-muted-foreground md:text-base">{t(descriptionKey(result), { email })}</p>
        </>
      ) : (
        <>
          <Loader2 aria-hidden className="size-12 animate-spin text-muted-foreground/40" strokeWidth={1} />
          <h1 className="font-serif text-3xl md:text-4xl">{t("pendingTitle")}</h1>
        </>
      )}

      <LocalizedLink
        className="mt-4 flex h-12 items-center justify-center bg-foreground px-8 text-xs tracking-[0.2em] text-background uppercase transition-colors hover:bg-foreground/90"
        to={ROUTES.HOME}
      >
        {t("continueShopping")}
      </LocalizedLink>
    </main>
  )
}

interface NewsletterTokenPageProps {
  readonly mutation: UseMutationResult<Newsletter["tokenResult"], Error, { readonly token: string }>
  readonly namespace: "pages.newsletter.confirm" | "pages.newsletter.unsubscribe"
  readonly token: string | undefined
}

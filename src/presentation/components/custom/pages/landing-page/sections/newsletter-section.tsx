import { type JSX, type SubmitEventHandler, useCallback, useState } from "react"

import { useMutation } from "@tanstack/react-query"
import { ArrowRight, Check, Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

import { NEWSLETTER_OUTCOME, NEWSLETTER_SOURCE } from "~/src/modules/newsletter/newsletter.constants"
import { subscribeToNewsletterMutation } from "~/src/modules/newsletter/use-cases/subscribe-to-newsletter"

import { Input } from "~/src/presentation/components/shadcn/input"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

export const NewsletterSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.newsletterSection")
  const locale = useLocale()
  const [email, setEmail] = useState("")
  const [invalid, setInvalid] = useState(false)
  const subscribe = useMutation(subscribeToNewsletterMutation)

  const handleSubmit = useCallback<SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      const candidate = email.trim()
      if (!EMAIL_PATTERN.test(candidate)) {
        setInvalid(true)

        return
      }

      setInvalid(false)
      subscribe.mutate({
        email: candidate,
        locale: isSupportedLocale(locale) ? locale : undefined,
        source: NEWSLETTER_SOURCE.LANDING,
      })
    },
    [email, locale, subscribe],
  )

  const handleChange = useCallback((event: { readonly target: { readonly value: string } }) => {
    setEmail(event.target.value)
    setInvalid(false)
  }, [])

  const confirmed = subscribe.data?.outcome

  return (
    <section className="bg-secondary/40 py-20 lg:py-28">
      <div className="reveal mx-auto max-w-400 px-6 lg:px-12">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h2 className="font-serif text-4xl leading-tight md:text-5xl">{t("title")}</h2>
          <p className="mx-auto max-w-lg text-base/relaxed text-foreground/60 md:text-lg/relaxed">{t("description")}</p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl lg:mt-12">
          {confirmed === undefined ? (
            <form className="space-y-3" noValidate onSubmit={handleSubmit}>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Input
                  aria-invalid={invalid}
                  aria-label={t("placeholder")}
                  autoComplete="email"
                  className="h-13 flex-1 rounded-none border-border/60 bg-background px-5 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-foreground/20"
                  onChange={handleChange}
                  placeholder={t("placeholder")}
                  type="email"
                  value={email}
                />
                <button
                  className="inline-flex h-13 shrink-0 items-center justify-center gap-2.5 rounded-none bg-primary px-10 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                  disabled={subscribe.isPending}
                  type="submit"
                >
                  {subscribe.isPending ? t("submitting") : t("cta")}
                  {subscribe.isPending ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight aria-hidden className="size-4" />
                  )}
                </button>
              </div>
              {invalid && <p className="text-center text-[12px] text-destructive">{t("invalidEmail")}</p>}
              {subscribe.isError && <p className="text-center text-[12px] text-destructive">{t("error")}</p>}
            </form>
          ) : (
            <p className="flex items-center justify-center gap-2.5 text-center text-sm text-foreground">
              <Check aria-hidden className="size-4 shrink-0 text-success" />
              {confirmed === NEWSLETTER_OUTCOME.ALREADY_CONFIRMED ? t("alreadySubscribed") : t("success")}
            </p>
          )}

          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground/60">{t("note")}</p>
        </div>
      </div>
    </section>
  )
}

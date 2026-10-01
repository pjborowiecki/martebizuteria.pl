import { type JSX } from "react"

import { CheckCircle2, XCircle } from "lucide-react"

import { NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const NewsletterTokenPage = ({ description, linkLabel, result, title }: Readonly<NewsletterTokenPageProps>): JSX.Element => {
  const succeeded = result === NEWSLETTER_TOKEN_RESULT.OK || result === NEWSLETTER_TOKEN_RESULT.ALREADY_DONE
  const Icon = succeeded ? CheckCircle2 : XCircle

  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-xl flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <Icon className={succeeded ? "size-14 text-success" : "size-14 text-muted-foreground/40"} strokeWidth={1} />
      <h1 className="font-serif text-3xl md:text-4xl">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground md:text-base">{description}</p>

      <LocalizedLink
        className="mt-4 flex h-12 items-center justify-center bg-foreground px-8 text-xs tracking-[0.2em] text-background uppercase transition-colors hover:bg-foreground/90"
        to={ROUTES.HOME}
      >
        {linkLabel}
      </LocalizedLink>
    </main>
  )
}

interface NewsletterTokenPageProps {
  readonly description: string
  readonly linkLabel: string
  readonly result: Newsletter["tokenResult"]["result"]
  readonly title: string
}

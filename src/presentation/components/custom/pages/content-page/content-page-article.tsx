import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "use-intl/react"

import { type ContentPageHandle } from "~/src/modules/content-page/content-page.constants"
import { getContentPageQuery } from "~/src/modules/content-page/use-cases/get-content-page"

import { useFormatter } from "~/src/hooks/use-display-format"

import { CONTENT_PROSE_CLASS } from "~/src/presentation/components/custom/pages/content-page/_styles/content-page.styles"
import { ContentPageMarkdown } from "~/src/presentation/components/custom/pages/content-page/content-page-markdown"

export const ContentPageArticle = ({ handle }: Readonly<{ handle: ContentPageHandle }>): JSX.Element => {
  const t = useTranslations("components.custom.contentPage")
  const format = useFormatter()
  const locale = useLocale()
  const { data: page } = useSuspenseQuery(getContentPageQuery(handle, locale))

  return (
    <main className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
      <article>
        <header>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">{page.title}</h1>
          <p className="mt-4 text-xs tracking-[0.12em] text-muted-foreground uppercase">
            {t("updated", { date: format.dateTime(page.revisedAt, { dateStyle: "long" }) })}
          </p>
        </header>
        <div className={`mt-14 ${CONTENT_PROSE_CLASS}`}>
          <ContentPageMarkdown body={page.body} />
        </div>
      </article>
    </main>
  )
}

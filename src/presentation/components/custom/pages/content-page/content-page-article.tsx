import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createMarkdownRenderer } from "fumadocs-core/content/md"
import { remarkGfm } from "fumadocs-core/mdx-plugins/remark-gfm"
import { remarkHeading } from "fumadocs-core/mdx-plugins/remark-heading"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { type ContentPageHandle } from "~/src/modules/content-page/content-page.constants"
import { getContentPageQuery } from "~/src/modules/content-page/use-cases/get-content-page"

import { mdxComponents } from "~/src/presentation/components/custom/mdx"
import { CONTENT_PROSE_CLASS } from "~/src/presentation/components/custom/pages/content-page/content-page.styles"

const { Markdown } = createMarkdownRenderer({ remarkPlugins: [remarkGfm, remarkHeading] })

const MARKDOWN_COMPONENTS = { a: mdxComponents.a }

export const ContentPageArticle = ({ handle }: Readonly<{ handle: ContentPageHandle }>): JSX.Element => {
  const t = useTranslations("components.custom.contentPage")
  const format = useFormatter()
  const locale = useLocale()
  const { data: page } = useSuspenseQuery(getContentPageQuery(handle, locale))

  return (
    <article className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
      <header>
        <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">{page.title}</h1>
        <p className="mt-4 text-xs tracking-[0.12em] text-muted-foreground uppercase">
          {t("updated", { date: format.dateTime(page.revisedAt, { dateStyle: "long" }) })}
        </p>
      </header>
      <div className={`mt-14 ${CONTENT_PROSE_CLASS}`}>
        <Markdown components={MARKDOWN_COMPONENTS}>{page.body}</Markdown>
      </div>
    </article>
  )
}

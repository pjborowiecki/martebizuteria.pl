import { type JSX, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createMarkdownRenderer } from "fumadocs-core/content/md"
import { remarkGfm } from "fumadocs-core/mdx-plugins/remark-gfm"
import { remarkHeading } from "fumadocs-core/mdx-plugins/remark-heading"
import remarkDirective from "remark-directive"
import { useLocale } from "use-intl/react"

import { getSellerDetailsQuery } from "~/src/modules/store-setting/use-cases/get-seller-details"

import { mdxComponents } from "~/src/presentation/components/custom/mdx"
import { remarkSellerDetails } from "~/src/presentation/components/custom/pages/content-page/remark-seller-details"

const MARKDOWN_COMPONENTS = { a: mdxComponents.a }

export const ContentPageMarkdown = ({ body }: Readonly<{ body: string }>): JSX.Element => {
  const locale = useLocale()
  const { data: seller } = useSuspenseQuery(getSellerDetailsQuery())
  const { Markdown } = useMemo(
    () => createMarkdownRenderer({ remarkPlugins: [remarkGfm, remarkHeading, remarkDirective, [remarkSellerDetails, { locale, seller }]] }),
    [locale, seller],
  )

  return <Markdown components={MARKDOWN_COMPONENTS}>{body}</Markdown>
}

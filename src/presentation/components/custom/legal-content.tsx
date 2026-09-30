import browserCollections from "collections/browser"

import { mdxComponents } from "~/src/presentation/components/custom/mdx"

export const legalContent = browserCollections.legal.createClientLoader({
  component: ({ default: Mdx, frontmatter }) => (
    <article className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
      <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">{frontmatter.title}</h1>
      <Mdx components={mdxComponents} />
    </article>
  ),
  id: "legal",
})

import browserCollections from "collections/browser"

import { docsMdxComponents } from "~/src/presentation/components/custom/docs-mdx"

export const docsContent = browserCollections.docs.createClientLoader({
  component: ({ default: Mdx, frontmatter }) => (
    <article className="min-w-0 pb-16">
      <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">{frontmatter.title}</h1>
      <Mdx components={docsMdxComponents} />
    </article>
  ),
  id: "docs",
})

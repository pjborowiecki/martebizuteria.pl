import { type ComponentProps } from "react"

import { mdxComponents } from "~/src/presentation/components/custom/mdx"

export const docsMdxComponents = {
  ...mdxComponents,
  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote className="mt-6 border-l-2 border-border pl-4 text-sm/relaxed text-muted-foreground italic" {...props} />
  ),
  code: (props: ComponentProps<"code">) => (
    <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground" {...props} />
  ),
  h4: (props: ComponentProps<"h4">) => <h4 className="mt-6 text-sm font-medium text-foreground" {...props} />,
  hr: (props: ComponentProps<"hr">) => <hr className="mt-10 border-border" {...props} />,
  pre: (props: ComponentProps<"pre">) => (
    <pre
      className="mt-6 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-xs/relaxed [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
      {...props}
    />
  ),
  table: (props: ComponentProps<"table">) => (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-sm" {...props} />
    </div>
  ),
  td: (props: ComponentProps<"td">) => (
    <td className="border-t border-border px-4 py-2.5 align-top text-sm/relaxed text-muted-foreground" {...props} />
  ),
  th: (props: ComponentProps<"th">) => (
    <th className="px-4 py-2.5 text-xs font-medium tracking-[0.08em] text-foreground uppercase" {...props} />
  ),
}

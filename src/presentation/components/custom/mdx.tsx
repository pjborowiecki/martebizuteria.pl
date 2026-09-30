import { type ComponentProps, type JSX } from "react"

import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

const ASSET_PATH_PATTERN = /\.[a-z0-9]+$/iu

const isLocalizablePath = (href: string | undefined): href is string =>
  href !== undefined && href.startsWith("/") && !ASSET_PATH_PATTERN.test(href)

const MdxLink = ({ href, ...props }: ComponentProps<"a">): JSX.Element => (
  <a
    className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
    href={isLocalizablePath(href) ? localizePathname({ locale: getCurrentLocale(), pathname: href }) : href}
    {...props}
  />
)

export const mdxComponents = {
  a: MdxLink,
  h1: (props: ComponentProps<"h1">) => <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl" {...props} />,
  h2: (props: ComponentProps<"h2">) => <h2 className="mt-14 font-serif text-2xl leading-snug tracking-tight first:mt-0" {...props} />,
  h3: (props: ComponentProps<"h3">) => <h3 className="mt-8 text-sm font-medium tracking-[0.12em] uppercase" {...props} />,
  li: (props: ComponentProps<"li">) => <li className="text-sm/relaxed text-muted-foreground" {...props} />,
  ol: (props: ComponentProps<"ol">) => <ol className="mt-4 ml-5 list-decimal space-y-2" {...props} />,
  p: (props: ComponentProps<"p">) => <p className="mt-4 text-sm/relaxed text-muted-foreground" {...props} />,
  strong: (props: ComponentProps<"strong">) => <strong className="font-medium text-foreground" {...props} />,
  ul: (props: ComponentProps<"ul">) => <ul className="mt-4 ml-5 list-disc space-y-2" {...props} />,
}

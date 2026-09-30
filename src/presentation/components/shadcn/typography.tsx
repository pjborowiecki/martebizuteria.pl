import { type ComponentPropsWithoutRef, type HTMLAttributes, type JSX, type ReactNode } from "react"

import { cn } from "cn"

export const H1 = ({ className, children, ...props }: HeadingProps<"h1">): JSX.Element => (
  <h1
    className={cn("scroll-m-20 font-serif text-4xl tracking-tight text-balance text-foreground italic md:text-5xl", className)}
    {...props}
  >
    {children}
  </h1>
)

export const H2 = ({ className, children, ...props }: HeadingProps<"h2">): JSX.Element => (
  <h2 className={cn("scroll-m-20 font-serif text-2xl tracking-tight text-foreground italic first:mt-0 md:text-3xl", className)} {...props}>
    {children}
  </h2>
)

export const H3 = ({ className, children, ...props }: HeadingProps<"h3">): JSX.Element => (
  <h3 className={cn("scroll-m-20 font-serif text-xl tracking-tight text-foreground italic", className)} {...props}>
    {children}
  </h3>
)

export const H4 = ({ className, children, ...props }: HeadingProps<"h4">): JSX.Element => (
  <h4 className={cn("scroll-m-20 font-serif text-lg tracking-tight text-foreground italic", className)} {...props}>
    {children}
  </h4>
)

const Paragraph = ({ className, ...props }: ElProps<"p">): JSX.Element => (
  <p className={cn("text-sm leading-relaxed text-foreground", className)} {...props} />
)

export { Paragraph as P }

export const Lead = ({ className, ...props }: ElProps<"p">): JSX.Element => (
  <p className={cn("text-base leading-relaxed font-light text-muted-foreground md:text-lg", className)} {...props} />
)

export const Large = ({ className, ...props }: ElProps<"div">): JSX.Element => (
  <div className={cn("text-lg font-medium text-foreground", className)} {...props} />
)

export const Small = ({ className, ...props }: ElProps<"small">): JSX.Element => (
  <small className={cn("text-xs leading-none text-muted-foreground", className)} {...props} />
)

export const Muted = ({ className, ...props }: ElProps<"p">): JSX.Element => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
)

export const Blockquote = ({ className, ...props }: ElProps<"blockquote">): JSX.Element => (
  <blockquote className={cn("mt-6 border-l-2 border-border pl-6 font-serif text-foreground italic", className)} {...props} />
)

export const InlineCode = ({ className, ...props }: ElProps<"code">): JSX.Element => (
  <code
    className={cn("relative rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-medium text-foreground", className)}
    {...props}
  />
)

export const List = ({ className, ...props }: ElProps<"ul">): JSX.Element => (
  <ul className={cn("my-6 ml-6 list-disc text-sm leading-relaxed [&>li]:mt-2", className)} {...props} />
)

export const TableWrap = ({ className, ...props }: ElProps<"div">): JSX.Element => (
  <div className={cn("my-6 w-full overflow-x-auto text-sm", className)} {...props} />
)

export const Prose = ({ className, ...props }: Readonly<HTMLAttributes<HTMLElement>>): JSX.Element => (
  <article
    className={cn(
      "prose max-w-none font-sans prose-neutral dark:prose-invert",
      "prose-headings:font-serif prose-headings:tracking-tight prose-headings:italic",
      "prose-headings:scroll-mt-24",
      className,
    )}
    {...props}
  />
)

type ElProps<TElement extends keyof JSX.IntrinsicElements> = Readonly<ComponentPropsWithoutRef<TElement>>

type HeadingProps<TElement extends "h1" | "h2" | "h3" | "h4"> = Readonly<
  Omit<ComponentPropsWithoutRef<TElement>, "children"> & {
    children: ReactNode
  }
>

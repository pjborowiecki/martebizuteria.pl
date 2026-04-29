import type { ComponentPropsWithoutRef, HTMLAttributes, JSX, ReactNode } from "react";

import { cn } from "~/src/lib/utils";

type ElProps<T extends keyof JSX.IntrinsicElements> = Readonly<ComponentPropsWithoutRef<T>>;
type HeadingProps<T extends "h1" | "h2" | "h3" | "h4"> = Readonly<Omit<ComponentPropsWithoutRef<T>, "children"> & { children: ReactNode }>;

export function H1({ className, children, ...props }: HeadingProps<"h1">): JSX.Element {
  return (
    <h1
      className={cn("scroll-m-20 font-serif text-4xl tracking-tight text-balance text-foreground italic md:text-5xl", className)}
      {...props}
    >
      {children}
    </h1>
  );
}

export function H2({ className, children, ...props }: HeadingProps<"h2">): JSX.Element {
  return (
    <h2
      className={cn("scroll-m-20 font-serif text-2xl tracking-tight text-foreground italic first:mt-0 md:text-3xl", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function H3({ className, children, ...props }: HeadingProps<"h3">): JSX.Element {
  return (
    <h3 className={cn("scroll-m-20 font-serif text-xl tracking-tight text-foreground italic", className)} {...props}>
      {children}
    </h3>
  );
}

export function H4({ className, children, ...props }: HeadingProps<"h4">): JSX.Element {
  return (
    <h4 className={cn("scroll-m-20 font-serif text-lg tracking-tight text-foreground italic", className)} {...props}>
      {children}
    </h4>
  );
}

export function P({ className, ...props }: ElProps<"p">): JSX.Element {
  return <p className={cn("text-sm leading-relaxed text-foreground", className)} {...props} />;
}

export function Lead({ className, ...props }: ElProps<"p">): JSX.Element {
  return <p className={cn("text-base leading-relaxed font-light text-muted-foreground md:text-lg", className)} {...props} />;
}

export function Large({ className, ...props }: ElProps<"div">): JSX.Element {
  return <div className={cn("text-lg font-medium text-foreground", className)} {...props} />;
}

export function Small({ className, ...props }: ElProps<"small">): JSX.Element {
  return <small className={cn("text-xs leading-none text-muted-foreground", className)} {...props} />;
}

export function Muted({ className, ...props }: ElProps<"p">): JSX.Element {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function Blockquote({ className, ...props }: ElProps<"blockquote">): JSX.Element {
  return <blockquote className={cn("mt-6 border-l-2 border-border pl-6 font-serif text-foreground italic", className)} {...props} />;
}

export function InlineCode({ className, ...props }: ElProps<"code">): JSX.Element {
  return (
    <code
      className={cn("relative rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

export function List({ className, ...props }: ElProps<"ul">): JSX.Element {
  return <ul className={cn("my-6 ml-6 list-disc text-sm leading-relaxed [&>li]:mt-2", className)} {...props} />;
}

export function TableWrap({ className, ...props }: ElProps<"div">): JSX.Element {
  return <div className={cn("my-6 w-full overflow-x-auto text-sm", className)} {...props} />;
}

export function Prose({ className, ...props }: Readonly<HTMLAttributes<HTMLElement>>): JSX.Element {
  return (
    <article
      className={cn(
        "prose max-w-none font-sans prose-neutral dark:prose-invert",
        "prose-headings:font-serif prose-headings:tracking-tight prose-headings:italic",
        "prose-headings:scroll-mt-24",
        className
      )}
      {...props}
    />
  );
}

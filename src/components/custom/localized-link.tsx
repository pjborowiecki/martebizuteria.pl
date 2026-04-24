import type { CSSProperties, JSX, MouseEventHandler, ReactNode } from "react";

import { Link } from "@tanstack/react-router";

import type { FileRouteTypes } from "~/src/routeTree.gen";

type LocalizedFullPaths = Extract<FileRouteTypes["to"], `/{-$locale}${string}`>;
type EmptyToSlash<Path extends string> = Path extends "" ? "/" : Path;
type StripLocalePrefix<Path extends string> = Path extends `/{-$locale}${infer Rest}` ? EmptyToSlash<Rest> : never;

export type LocalizedTo = StripLocalePrefix<LocalizedFullPaths>;

interface ActiveLinkProps {
  readonly className?: string;
  readonly style?: Readonly<CSSProperties>;
}

export interface LocalizedLinkProps {
  readonly to: LocalizedTo;
  readonly children?: ReactNode;
  readonly className?: string;
  readonly style?: Readonly<CSSProperties>;
  readonly id?: string;
  readonly target?: "_blank" | "_self" | "_parent" | "_top";
  readonly rel?: string;
  readonly onClick?: MouseEventHandler<HTMLAnchorElement>;
  readonly activeProps?: Readonly<ActiveLinkProps>;
  readonly inactiveProps?: Readonly<ActiveLinkProps>;
  readonly "aria-label"?: string;
  readonly "aria-current"?: boolean | "page" | "step" | "location" | "date" | "time";
  readonly "aria-describedby"?: string;
  readonly "aria-hidden"?: boolean;
}

function buildLocalizedPath(to: LocalizedTo): string {
  if (to === "/") {
    return "/{-$locale}";
  }
  return `/{-$locale}${to}`;
}

export function LocalizedLink({
  to,
  children,
  className,
  style,
  id,
  target,
  rel,
  onClick,
  activeProps,
  inactiveProps,
  ...ariaProps
}: LocalizedLinkProps): JSX.Element {
  return (
    <Link
      to={buildLocalizedPath(to)}
      className={className}
      style={style}
      id={id}
      target={target}
      rel={rel}
      onClick={onClick}
      activeProps={activeProps}
      inactiveProps={inactiveProps}
      aria-label={ariaProps["aria-label"]}
      aria-current={ariaProps["aria-current"]}
      aria-describedby={ariaProps["aria-describedby"]}
      aria-hidden={ariaProps["aria-hidden"]}
    >
      {children}
    </Link>
  );
}

import { type CSSProperties, forwardRef, type MouseEventHandler, type ReactNode } from "react";

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
  readonly params?: Readonly<Record<string, string | number | undefined>>;
  readonly children?: ReactNode;
  readonly className?: string;
  readonly style?: Readonly<CSSProperties>;
  readonly id?: string;
  readonly target?: "_blank" | "_self" | "_parent" | "_top";
  readonly rel?: string;
  readonly onClick?: MouseEventHandler<HTMLAnchorElement>;
  readonly onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
  readonly onMouseLeave?: MouseEventHandler<HTMLAnchorElement>;
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

interface InternalLinkProps {
  readonly localizedTo: string;
  readonly props: LocalizedLinkProps;
}

const LinkWithParams = forwardRef<HTMLAnchorElement, InternalLinkProps>(({ localizedTo, props }, ref) => (
  <Link
    ref={ref}
    to={localizedTo}
    params={props.params}
    className={props.className}
    style={props.style}
    id={props.id}
    target={props.target}
    rel={props.rel}
    onClick={props.onClick}
    onMouseEnter={props.onMouseEnter}
    onMouseLeave={props.onMouseLeave}
    activeProps={props.activeProps}
    inactiveProps={props.inactiveProps}
    aria-label={props["aria-label"]}
    aria-current={props["aria-current"]}
    aria-describedby={props["aria-describedby"]}
    aria-hidden={props["aria-hidden"]}
  >
    {props.children}
  </Link>
));

LinkWithParams.displayName = "LinkWithParams";

const LinkWithoutParams = forwardRef<HTMLAnchorElement, InternalLinkProps>(({ localizedTo, props }, ref) => (
  <Link
    ref={ref}
    to={localizedTo}
    className={props.className}
    style={props.style}
    id={props.id}
    target={props.target}
    rel={props.rel}
    onClick={props.onClick}
    onMouseEnter={props.onMouseEnter}
    onMouseLeave={props.onMouseLeave}
    activeProps={props.activeProps}
    inactiveProps={props.inactiveProps}
    aria-label={props["aria-label"]}
    aria-current={props["aria-current"]}
    aria-describedby={props["aria-describedby"]}
    aria-hidden={props["aria-hidden"]}
  >
    {props.children}
  </Link>
));

LinkWithoutParams.displayName = "LinkWithoutParams";

export const LocalizedLink = forwardRef<HTMLAnchorElement, LocalizedLinkProps>((props, ref) => {
  const localizedTo = buildLocalizedPath(props.to);

  if (props.params !== undefined) {
    return <LinkWithParams localizedTo={localizedTo} props={props} ref={ref} />;
  }

  return <LinkWithoutParams localizedTo={localizedTo} props={props} ref={ref} />;
});

LocalizedLink.displayName = "LocalizedLink";

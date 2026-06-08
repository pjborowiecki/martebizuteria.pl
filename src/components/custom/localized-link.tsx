import { Link, type LinkComponentProps } from "@tanstack/react-router";

import type { FileRouteTypes } from "~/src/routeTree.gen";

type LocalizedFullPaths = Extract<FileRouteTypes["to"], `/{-$locale}${string}`>;
type EmptyToSlash<Path extends string> = Path extends "" ? "/" : Path;
type StripLocalePrefix<Path extends string> = Path extends `/{-$locale}${infer Rest}` ? EmptyToSlash<Rest> : never;

export type LocalizedTo = StripLocalePrefix<LocalizedFullPaths>;

type BaseLinkProps = LinkComponentProps;

export type LocalizedLinkProps = Omit<BaseLinkProps, "to" | "params"> & {
  readonly to: LocalizedTo;
  readonly params?: Readonly<Record<string, string | number | undefined>>;
  readonly search?: BaseLinkProps["search"];
};

function buildLocalizedPath(to: LocalizedTo): LocalizedFullPaths {
  if (to === "/") {
    return "/{-$locale}";
  }

  return `/{-$locale}${to}`;
}

export function LocalizedLink({ to, params, search, children, preload = "intent", ...rest }: LocalizedLinkProps) {
  const localizedTo = buildLocalizedPath(to);

  if (params !== undefined) {
    return (
      <Link to={localizedTo} params={params} search={search} preload={preload} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <Link to={localizedTo} search={search} preload={preload} {...rest}>
      {children}
    </Link>
  );
}

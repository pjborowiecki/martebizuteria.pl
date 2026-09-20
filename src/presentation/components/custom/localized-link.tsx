import { Link, type LinkComponentProps } from "@tanstack/react-router"

import { type FileRouteTypes } from "~/src/routeTree.gen"
const buildLocalizedPath = (to: LocalizedTo): LocalizedFullPaths => {
  if (to === "/") {
    return "/{-$locale}"
  }
  return `/{-$locale}${to}`
}
export const LocalizedLink = ({ to, params, children, preload = "intent", ...rest }: LocalizedLinkProps) => (
  // `true` is TanStack Router's "inherit the current path params", which is how it also treats an absent `params`.
  <Link {...rest} to={buildLocalizedPath(to)} params={params ?? true} preload={preload}>
    {children}
  </Link>
)
type LocalizedFullPaths = Extract<FileRouteTypes["to"], `/{-$locale}${string}`>
type EmptyToSlash<Path extends string> = Path extends "" ? "/" : Path
type StripLocalePrefix<Path extends string> = Path extends `/{-$locale}${infer Rest}` ? EmptyToSlash<Rest> : never
export type LocalizedTo = StripLocalePrefix<LocalizedFullPaths>
type BaseLinkProps = LinkComponentProps
export type LocalizedLinkProps = Omit<BaseLinkProps, "to" | "params"> & {
  readonly to: LocalizedTo
  readonly params?: Readonly<Record<string, string | number | undefined>> | undefined
}

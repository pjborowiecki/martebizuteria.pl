import { Link, type LinkComponentProps } from "@tanstack/react-router"

import { type FileRouteTypes } from "~/src/routeTree.gen"

export const LocalizedLink = ({ to, params, children, ...rest }: LocalizedLinkProps) => (
  <Link {...rest} to={to} params={params ?? true}>
    {children}
  </Link>
)

export type LocalizedTo = FileRouteTypes["to"]

export type LocalizedLinkProps = Omit<LinkComponentProps, "to" | "params"> & {
  readonly to: LocalizedTo
  readonly params?: Readonly<Record<string, string | number | undefined>> | undefined
}

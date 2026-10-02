import { type Query, type QueryClient, queryOptions } from "@tanstack/react-query"
import { type AbstractIntlMessages } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export type NamespaceEntry = readonly [namespace: string, messages: AbstractIntlMessages]

const MESSAGES_QUERY_KEY = "messages"

const NAMESPACE_SEPARATOR = "."

const messageModules = import.meta.glob<AbstractIntlMessages>("../../../messages/*/*.json", { import: "default" })

export const toNamespace = (path: string): string => path.replaceAll(/^.*\/|\.json$/gu, "")

const rootMessagePaths = Object.keys(
  import.meta.glob([
    "../../../messages/*/common.json",
    "../../../messages/*/components.custom.json",
    "../../../messages/*/components.shadcn.json",
    "../../../messages/*/errors.json",
    "../../../messages/*/pages.auth.errors.json",
    "../../../messages/*/pages.auth.toast.json",
  ]),
)

export const ROOT_NAMESPACES = [...new Set(rootMessagePaths.map((path) => toNamespace(path)))]

const modulePath = ({ locale, namespace }: { locale: SupportedLocale; namespace: string }): string =>
  `../../../messages/${locale}/${namespace}.json`

export function loadNamespace<TMessages extends AbstractIntlMessages>(args: {
  locale: SupportedLocale
  namespace: string
}): Promise<TMessages>

export function loadNamespace({ locale, namespace }: { locale: SupportedLocale; namespace: string }): Promise<AbstractIntlMessages> {
  const load = messageModules[modulePath({ locale, namespace })]

  if (load === undefined) {
    throw new Error(`Missing translation namespace: messages/${locale}/${namespace}.json`)
  }

  return load()
}

const mergeMessages = (target: AbstractIntlMessages, source: AbstractIntlMessages): AbstractIntlMessages => {
  const result = {
    ...target,
  }

  for (const [key, value] of Object.entries(source)) {
    const existing = result[key]

    result[key] = typeof existing === "object" && typeof value === "object" ? mergeMessages(existing, value) : value
  }

  return result
}

export const buildMessageTree = (entries: readonly NamespaceEntry[]): AbstractIntlMessages => {
  let tree: AbstractIntlMessages = {}

  for (const [namespace, messages] of entries) {
    let branch = messages

    for (const segment of namespace.split(NAMESPACE_SEPARATOR).toReversed()) {
      branch = {
        [segment]: branch,
      }
    }

    tree = mergeMessages(tree, branch)
  }

  return tree
}

export const getRouteNamespaces = (
  matches: readonly {
    readonly staticData: {
      readonly namespaces?: readonly string[]
    }
  }[],
): string[] => [...new Set([...ROOT_NAMESPACES, ...matches.flatMap((match) => match.staticData.namespaces ?? [])])]

export const isMessagesQuery = ({ queryKey }: Pick<Query, "queryKey">): boolean => queryKey[0] === MESSAGES_QUERY_KEY

export const messagesQueryOptions = <TMessages extends AbstractIntlMessages = AbstractIntlMessages>({
  locale,
  namespace,
}: {
  locale: SupportedLocale
  namespace: string
}) =>
  queryOptions({
    gcTime: Infinity,
    queryFn: () => loadNamespace<TMessages>({ locale, namespace }),
    queryKey: [MESSAGES_QUERY_KEY, locale, namespace],
    staleTime: Infinity,
  })

export const preloadNamespaces = async ({
  locale,
  namespaces,
  queryClient,
}: {
  locale: SupportedLocale
  namespaces: readonly string[]
  queryClient: QueryClient
}): Promise<void> => {
  await Promise.all(namespaces.map((namespace) => queryClient.query(messagesQueryOptions({ locale, namespace }))))
}

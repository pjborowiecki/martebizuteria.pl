import { type QueryClient, queryOptions } from "@tanstack/react-query"
import { type AbstractIntlMessages } from "use-intl"

import { type Locale, type MessageNamespace, type NamespaceMessages } from "~/src/integrations/use-intl/i18n.types"
export const loadNamespace = async <TNamespace extends MessageNamespace>(
  locale: Locale,
  namespace: TNamespace,
): Promise<NamespaceMessages[TNamespace]> => {
  const load = messageModules[`../../../messages/${locale}/${namespace}.json`]
  if (load === undefined) {
    throw new Error(`Missing translation namespace: messages/${locale}/${namespace}.json`)
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The file path identifies the JSON type in NamespaceMessages.
  return (await load()) as NamespaceMessages[TNamespace]
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
    for (const segment of namespace.split(".").toReversed()) {
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
      readonly namespaces?: readonly MessageNamespace[]
    }
  }[],
): MessageNamespace[] => [...new Set([...ROOT_NAMESPACES, ...matches.flatMap((match) => match.staticData.namespaces ?? [])])]

export const preloadNamespaces = async ({
  locale,
  namespaces,
  queryClient,
}: {
  locale: Locale
  namespaces: readonly MessageNamespace[]
  queryClient: QueryClient
}): Promise<void> => {
  await Promise.all(namespaces.map((namespace) => queryClient.query(messagesQueryOptions(locale, namespace))))
}
export type NamespaceEntry = readonly [namespace: MessageNamespace, messages: AbstractIntlMessages]
export const ROOT_NAMESPACES = [
  "common",
  "components.custom",
  "components.shadcn",
  "pages.auth.toast",
] as const satisfies readonly MessageNamespace[]
const messageModules = import.meta.glob<AbstractIntlMessages>(
  [
    "../../../messages/*/*.json",
    "!../../../messages/*/emails*.json",
    "!../../../messages/*/pages.auth.email.json",
    "!../../../messages/*/components.defaults.json",
  ],
  {
    import: "default",
  },
)
export const messagesQueryOptions = <TNamespace extends MessageNamespace>(locale: Locale, namespace: TNamespace) =>
  queryOptions({
    gcTime: Infinity,
    queryFn: () => loadNamespace(locale, namespace),
    queryKey: ["messages", locale, namespace] as const,
    staleTime: Infinity,
  })

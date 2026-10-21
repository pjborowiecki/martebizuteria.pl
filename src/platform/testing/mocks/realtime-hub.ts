import { type RealtimeInvalidationHub } from "~/src/durable-objects/realtime-invalidation-hub"

export class TestDurableObject {
  readonly ctx: DurableObjectState

  readonly env: Env

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx
    this.env = env
  }
}

export const createTestDurableObjectState = (name?: string): DurableObjectState => {
  const values = new Map<string, unknown>()

  return {
    getWebSockets: () => [],
    id: { equals: () => false, name, toString: () => name ?? "anonymous" },
    storage: {
      kv: {
        delete: (key: string) => values.delete(key),
        get: (key: string) => values.get(key),
        list: () => values.entries(),
        put: (key: string, value: unknown) => {
          values.set(key, value)
        },
      },
    },
  } as unknown as DurableObjectState
}

const createTestRealtimeHubs = () => {
  const hubs = new Map<string, Promise<RealtimeInvalidationHub>>()
  const hubNamed = (name: string): Promise<RealtimeInvalidationHub> => {
    const known = hubs.get(name)
    if (known !== undefined) {
      return known
    }

    const created = import("~/src/durable-objects/realtime-invalidation-hub").then(
      ({ RealtimeInvalidationHub }) => new RealtimeInvalidationHub(createTestDurableObjectState(name), {} as Env),
    )
    hubs.set(name, created)

    return created
  }
  const namespace = {
    failVersionReads: false,
    getByName: (name: string) => ({
      notifyInvalidation: async (topics: readonly string[]): Promise<void> => {
        namespace.notified.push({ hub: name, topics })
        const hub = await hubNamed(name)
        hub.notifyInvalidation(topics)
      },
      storefrontCacheVersion: async (): Promise<string> => {
        if (namespace.failVersionReads) {
          throw new Error("the realtime hub is unavailable")
        }

        if (namespace.hangVersionReads) {
          return new Promise<string>(() => {})
        }

        const hub = await hubNamed(name)

        return hub.storefrontCacheVersion()
      },
    }),
    hangVersionReads: false,
    notified: [] as { readonly hub: string; readonly topics: readonly string[] }[],
    reset: (): void => {
      hubs.clear()
      namespace.notified.length = 0
      namespace.failVersionReads = false
      namespace.hangVersionReads = false
    },
  }

  return namespace
}

export const testRealtimeHubs = createTestRealtimeHubs()

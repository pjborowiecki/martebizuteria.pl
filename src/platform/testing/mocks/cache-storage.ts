interface StoredResponse {
  readonly body: string
  readonly headers: readonly [string, string][]
}

export const createTestCache = () => {
  const cache = {
    entries: new Map<string, StoredResponse>(),
    failMatch: false,
    failPut: false,
    match: (request: Request): Promise<Response | undefined> => {
      if (cache.failMatch) {
        return Promise.reject(new Error("cache read failed"))
      }

      const stored = cache.entries.get(request.url)

      return Promise.resolve(stored === undefined ? undefined : new Response(stored.body, { headers: [...stored.headers] }))
    },
    put: async (request: Request, response: Response): Promise<void> => {
      if (cache.failPut) {
        throw new Error("cache write failed")
      }

      cache.entries.set(request.url, { body: await response.text(), headers: [...response.headers.entries()] })
    },
  }

  return cache
}

export type TestCache = ReturnType<typeof createTestCache>

export class TestCacheStorage {
  readonly opened = new Map<string, TestCache>()

  failOpen = false

  cache(name: string): TestCache {
    const cache = this.opened.get(name) ?? createTestCache()
    this.opened.set(name, cache)

    return cache
  }

  open(name: string): Promise<Cache> {
    return this.failOpen ? Promise.reject(new Error("cache storage unavailable")) : Promise.resolve(this.cache(name) as unknown as Cache)
  }
}

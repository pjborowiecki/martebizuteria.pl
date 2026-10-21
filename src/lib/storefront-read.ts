import "@tanstack/react-start/server-only"

import { AsyncLocalStorage } from "node:async_hooks"

const storefrontReadScope = new AsyncLocalStorage<true>()

export const readThroughStorefrontCache = <TResult>(read: () => PromiseLike<TResult>): Promise<TResult> =>
  storefrontReadScope.run(true, async () => {
    const result = await read()

    return result
  })

export const isStorefrontRead = (): boolean => storefrontReadScope.getStore() === true

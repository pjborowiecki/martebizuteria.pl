import { type TestWebSocket } from "~/src/durable-objects/__test__/doubles/test-web-socket"

export class TestHubState implements DurableObjectState {
  declare readonly exports: DurableObjectState["exports"]
  declare readonly props: DurableObjectState["props"]
  declare readonly storage: DurableObjectState["storage"]
  declare facets: DurableObjectState["facets"]
  declare blockConcurrencyWhile: DurableObjectState["blockConcurrencyWhile"]
  declare setWebSocketAutoResponse: DurableObjectState["setWebSocketAutoResponse"]
  declare getWebSocketAutoResponse: DurableObjectState["getWebSocketAutoResponse"]
  declare getWebSocketAutoResponseTimestamp: DurableObjectState["getWebSocketAutoResponseTimestamp"]
  declare setHibernatableWebSocketEventTimeout: DurableObjectState["setHibernatableWebSocketEventTimeout"]
  declare getHibernatableWebSocketEventTimeout: DurableObjectState["getHibernatableWebSocketEventTimeout"]
  declare getTags: DurableObjectState["getTags"]
  declare abort: DurableObjectState["abort"]
  declare waitUntil: DurableObjectState["waitUntil"]

  readonly id: DurableObjectId

  readonly accepted: { tags: string[] | undefined; ws: WebSocket }[] = []

  readonly requestedTags: (string | undefined)[] = []

  untaggedSockets: TestWebSocket[] = []

  taggedSockets: TestWebSocket[] = []

  constructor(hubName?: string) {
    this.id =
      hubName === undefined
        ? { equals: () => false, toString: () => "anonymous" }
        : { equals: () => false, name: hubName, toString: () => hubName }
  }

  acceptWebSocket(ws: WebSocket, tags?: string[]): void {
    this.accepted.push({ tags, ws })
  }

  getWebSockets(tag?: string): WebSocket[] {
    this.requestedTags.push(tag)

    return tag === undefined ? this.untaggedSockets : this.taggedSockets
  }
}

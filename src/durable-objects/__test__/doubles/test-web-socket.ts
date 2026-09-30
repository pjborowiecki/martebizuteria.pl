export class TestWebSocket implements WebSocket {
  declare accept: WebSocket["accept"]
  declare serializeAttachment: WebSocket["serializeAttachment"]
  declare deserializeAttachment: WebSocket["deserializeAttachment"]
  declare readyState: WebSocket["readyState"]
  declare url: WebSocket["url"]
  declare protocol: WebSocket["protocol"]
  declare extensions: WebSocket["extensions"]
  declare binaryType: WebSocket["binaryType"]
  declare bufferedAmount: WebSocket["bufferedAmount"]
  declare onclose: WebSocket["onclose"]
  declare onerror: WebSocket["onerror"]
  declare onmessage: WebSocket["onmessage"]
  declare onopen: WebSocket["onopen"]
  declare CONNECTING: WebSocket["CONNECTING"]
  declare OPEN: WebSocket["OPEN"]
  declare CLOSING: WebSocket["CLOSING"]
  declare CLOSED: WebSocket["CLOSED"]
  declare addEventListener: WebSocket["addEventListener"]
  declare removeEventListener: WebSocket["removeEventListener"]
  declare dispatchEvent: WebSocket["dispatchEvent"]

  readonly sent: string[] = []

  readonly closed: { code: number | undefined; reason: string | undefined }[] = []

  failOnSend = false

  send(message: unknown): void {
    if (this.failOnSend) {
      throw new Error("socket is gone")
    }

    this.sent.push(typeof message === "string" ? message : "")
  }

  close(code?: number, reason?: string): void {
    this.closed.push({ code, reason })
  }
}

import { vi } from "vite-plus/test"

export class StubBroadcastChannel {
  static readonly posted = vi.fn<(message: unknown) => void>()

  addEventListener(): void {}

  postMessage(message: unknown): void {
    StubBroadcastChannel.posted(message)
  }
}

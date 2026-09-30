const STUB_VIEWPORT_WIDTH = 1024

const STUB_VIEWPORT_HEIGHT = 768

interface StubResizeEntry {
  readonly contentRect: { readonly height: number; readonly width: number }
  readonly target: unknown
}

export class StubResizeObserver {
  private readonly report: (entries: readonly StubResizeEntry[]) => void

  constructor(callback: (entries: readonly StubResizeEntry[]) => void) {
    this.report = callback
  }

  observe(target: unknown): void {
    this.report([{ contentRect: { height: STUB_VIEWPORT_HEIGHT, width: STUB_VIEWPORT_WIDTH }, target }])
  }

  unobserve(): void {}

  disconnect(): void {}
}

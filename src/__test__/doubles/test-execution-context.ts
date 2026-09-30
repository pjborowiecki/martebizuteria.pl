export class TestExecutionContext implements ExecutionContext {
  declare readonly exports: Cloudflare.Exports
  declare readonly props: unknown
  declare tracing: Tracing

  readonly keptAlive: Promise<unknown>[] = []

  passedThroughOnException = false

  waitUntil(promise: Promise<unknown>): void {
    this.keptAlive.push(promise)
  }

  passThroughOnException(): void {
    this.passedThroughOnException = true
  }

  abort(): void {
    throw new Error("This double never aborts the request")
  }
}

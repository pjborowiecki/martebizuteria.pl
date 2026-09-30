export class StubIntersectionObserver {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}

  takeRecords(): readonly never[] {
    return []
  }
}

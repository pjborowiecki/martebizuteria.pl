export {};

declare global {
  interface ObjectConstructor {
    fromEntries<K extends PropertyKey, V>(entries: Iterable<readonly [K, V]>): Record<K, V>;
  }
}

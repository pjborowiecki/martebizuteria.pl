import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  interface ObjectConstructor {
    fromEntries<K extends PropertyKey, V>(entries: Iterable<readonly [K, V]>): Record<K, V>;
  }
}

declare module "@tanstack/react-start" {
  interface Register {
    server: { requestContext: RequestContext };
  }
}

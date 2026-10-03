import { type TestInfo } from "@playwright/test"

export const uniqueEmail = (testInfo: TestInfo, label: string): string =>
  `${label}-${testInfo.project.name}-${crypto.randomUUID().slice(0, 8)}@example.test`

export const uniqueCode = (prefix: string): string => `${prefix}${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`

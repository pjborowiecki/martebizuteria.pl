import { type BatchItem } from "drizzle-orm/batch"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
export const runDrizzleBatch = async (statements: readonly DrizzleBatchStatement[]): Promise<void> => {
  if (statements.length === EMPTY_BATCH_LENGTH) {
    return
  }
  const [first, ...rest] = statements
  if (first === undefined) {
    return
  }
  await db.batch([first, ...rest])
}
export type DrizzleBatchStatement = BatchItem<"sqlite">
const EMPTY_BATCH_LENGTH = 0

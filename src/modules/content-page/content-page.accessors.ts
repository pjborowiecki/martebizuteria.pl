import { and, asc, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { type ContentPageHandle } from "~/src/modules/content-page/content-page.constants"
import { contentPage } from "~/src/modules/content-page/content-page.schema"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"

export const findContentPageByHandle = async (handle: ContentPageHandle): Promise<ContentPage["select"] | undefined> => {
  const [row] = await db.select().from(contentPage).where(eq(contentPage.handle, handle)).limit(1)

  return row
}

export const listContentPages = (): Promise<ContentPage["adminListItem"][]> =>
  db
    .select({ handle: contentPage.handle, titles: contentPage.titles, updatedAt: contentPage.updatedAt })
    .from(contentPage)
    .orderBy(asc(contentPage.handle))

export const updateContentPageIfUnchanged = async (
  { bodies, descriptions, expectedUpdatedAt, handle, titles }: ContentPage["updateInput"],
  revisedAts: ContentPage["revisionMap"],
): Promise<Pick<ContentPage["select"], "updatedAt"> | undefined> => {
  const [updated] = await db
    .update(contentPage)
    .set({ bodies, descriptions, revisedAts, titles })
    .where(and(eq(contentPage.handle, handle), eq(contentPage.updatedAt, expectedUpdatedAt)))
    .returning({ updatedAt: contentPage.updatedAt })

  return updated
}

import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

export const toAdminNewsletterListItem = (row: Newsletter["select"]): Newsletter["adminListItem"] => ({
  confirmedAt: row.confirmedAt ?? undefined,
  createdAt: row.createdAt,
  email: row.email,
  id: row.id,
  locale: row.locale,
  source: row.source,
  status: row.status,
  unsubscribedAt: row.unsubscribedAt ?? undefined,
})

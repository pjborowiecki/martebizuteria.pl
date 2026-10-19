import { type Newsletter } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const NEWSLETTER_SUBSCRIBERS_DATA_GRID_KEY = "admin.newsletter-subscribers"

export const newsletterSubscribersDataGrid = createDataGrid<Newsletter["adminListItem"]>({
  persistenceKey: NEWSLETTER_SUBSCRIBERS_DATA_GRID_KEY,
})

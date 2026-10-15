import { useMemo } from "react"

import { useFormatter, useTranslations } from "use-intl/react"

import { buildNewsletterSubscriberColumns } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/lib/newsletter-subscribers-column-defs"

export const useNewsletterSubscriberColumns = () => {
  const t = useTranslations("pages.admin.marketing.subscribers")
  const tAdmin = useTranslations("pages.admin")
  const format = useFormatter()

  return useMemo(() => buildNewsletterSubscriberColumns({ format, t, tAdmin }), [format, t, tAdmin])
}

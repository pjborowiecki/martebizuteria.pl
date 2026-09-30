import { legal } from "collections/server"
import { loader } from "fumadocs-core/source"

import { i18n } from "~/src/integrations/fumadocs/fumadocs.i18n"

export const legalSource = loader({
  baseUrl: "/",
  i18n,
  source: legal.toFumadocsSource(),
})

export type LegalPage = NonNullable<ReturnType<typeof legalSource.getPage>>

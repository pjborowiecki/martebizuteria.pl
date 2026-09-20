import { type JSX } from "react"

import { CatalogTruncatedTextCell } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"
export const AttributeAllowedValuesCell = ({ displayText }: Readonly<AttributeAllowedValuesCellProps>): JSX.Element => (
  <CatalogTruncatedTextCell text={displayText} />
)

interface AttributeAllowedValuesCellProps {
  readonly displayText: string
}

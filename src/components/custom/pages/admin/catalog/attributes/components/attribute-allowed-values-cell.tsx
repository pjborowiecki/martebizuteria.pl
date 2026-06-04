import type { JSX } from "react";

import { CatalogTruncatedTextCell } from "~/src/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell";

interface AttributeAllowedValuesCellProps {
  readonly displayText: string;
}

export function AttributeAllowedValuesCell({ displayText }: Readonly<AttributeAllowedValuesCellProps>): JSX.Element {
  return <CatalogTruncatedTextCell text={displayText} />;
}

import { type JSX } from "react"

import { type ProductRecord } from "~/src/data/catalog-data"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Table, TableBody } from "~/src/presentation/components/shadcn/table"

import { CatalogPagination } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-table/catalog-pagination"
import { CatalogRow } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-table/catalog-row"
import { CatalogTableHeader } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-table/catalog-table-header"
import { CatalogToolbar } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-toolbar/catalog-toolbar"
export const CatalogTable = ({ products }: CatalogTableProps): JSX.Element => (
  <Card className="border-border/40 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-transparent shadow-none">
    <CardContent className="p-0">
      <CatalogToolbar />
      <Table>
        <CatalogTableHeader />
        <TableBody>
          {products.map((product) => (
            <CatalogRow key={product.id} product={product} />
          ))}
        </TableBody>
      </Table>
      <CatalogPagination />
    </CardContent>
  </Card>
)

interface CatalogTableProps {
  readonly products: readonly ProductRecord[]
}

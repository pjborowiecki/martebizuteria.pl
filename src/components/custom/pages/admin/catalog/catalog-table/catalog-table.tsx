import type { JSX } from "react";

import { Card, CardContent } from "~/src/components/shadcn/card";
import { Table, TableBody } from "~/src/components/shadcn/table";

import { CatalogPagination } from "~/src/components/custom/pages/admin/catalog/catalog-table/catalog-pagination";
import { CatalogRow } from "~/src/components/custom/pages/admin/catalog/catalog-table/catalog-row";
import { CatalogTableHeader } from "~/src/components/custom/pages/admin/catalog/catalog-table/catalog-table-header";
import { CatalogToolbar } from "~/src/components/custom/pages/admin/catalog/catalog-toolbar/catalog-toolbar";

import type { ProductRecord } from "~/src/data/catalog-data";

interface CatalogTableProps {
  readonly products: readonly ProductRecord[];
}

export function CatalogTable({ products }: CatalogTableProps): JSX.Element {
  return (
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
  );
}

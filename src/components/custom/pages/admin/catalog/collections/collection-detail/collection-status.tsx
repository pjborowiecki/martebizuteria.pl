import { type JSX, useCallback } from "react";

import { Package } from "lucide-react";
import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/src/components/shadcn/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

import { COLLECTION_STATUS_LABEL_KEYS, type CollectionStatus } from "~/src/modules/collection/collection.constants";

export interface CollectionStatusCardProps {
  onStatusChange: (val: CollectionStatus) => void;
  status: CollectionStatus;
}

export function CollectionStatusCard({ onStatusChange, status }: Readonly<CollectionStatusCardProps>): JSX.Element {
  const t = useTranslations("admin");

  const handleStatusChange = useCallback(
    (val: CollectionStatus | null) => {
      if (val !== null) {
        onStatusChange(val);
      }
    },
    [onStatusChange]
  );

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Package className="size-4 text-muted-foreground/60" strokeWidth={1.5} />
          <span className="text-[14px] font-medium">{t("collections.form.status")}</span>
        </div>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger
            aria-label={t("collections.form.status")}
            className="min-h-11 w-full min-w-0 rounded-none border-0 border-b border-border bg-background px-3 py-2.5 text-sm shadow-none ring-0 transition-[color,background-color,border-color] outline-none focus-visible:border-foreground focus-visible:ring-0 data-[state=open]:border-foreground [&>svg]:opacity-50"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">{t(COLLECTION_STATUS_LABEL_KEYS.draft)}</SelectItem>
            <SelectItem value="active">{t(COLLECTION_STATUS_LABEL_KEYS.active)}</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

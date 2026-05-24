import { type ChangeEvent, type JSX, useCallback } from "react";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";

import type { ProductVariant } from "~/src/data/catalog-data";

interface ProductEditorVariantsProps {
  readonly onAdd: () => void;
  readonly onRemove: (id: number) => void;
  readonly onUpdate: (id: number, field: keyof ProductVariant, value: string) => void;
  readonly variants: readonly ProductVariant[];
}

const EMPTY_LENGTH = 0;
const OFFSET_LAST = 1;

export function ProductEditorVariants({ onAdd, onRemove, onUpdate, variants }: Readonly<ProductEditorVariantsProps>): JSX.Element {
  const t = useTranslations("admin.newProduct");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{t("variants.title")}</CardTitle>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-[12px] font-medium text-foreground/60 transition-colors hover:text-foreground"
        >
          <Plus className="size-3.5" strokeWidth={1.5} />
          {t("variants.add")}
        </button>
      </CardHeader>
      <CardContent>
        {variants.length === EMPTY_LENGTH ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/50 py-8 text-muted-foreground/50 transition-colors hover:border-foreground/20 hover:text-muted-foreground"
          >
            <Plus className="size-4" strokeWidth={1.5} />
            <span className="text-[13px]">{t("variants.addFirst")}</span>
          </button>
        ) : (
          <div className="overflow-hidden rounded-lg ring-1 ring-border/40">
            <div className="grid grid-cols-[20px_1fr_1fr_110px_80px_28px] items-center gap-2 bg-secondary/30 px-3 py-2">
              <span />
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground/50 uppercase">{t("variants.name")}</span>
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground/50 uppercase">
                {t("variants.optionValue")}
              </span>
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground/50 uppercase">{t("variants.price")}</span>
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground/50 uppercase">{t("variants.stock")}</span>
              <span />
            </div>

            {variants.map((variant, idx) => (
              <VariantRow
                key={variant.id}
                isLast={idx === variants.length - OFFSET_LAST}
                onRemove={onRemove}
                onUpdate={onUpdate}
                variant={variant}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VariantRow({
  isLast,
  onRemove,
  onUpdate,
  variant
}: Readonly<{
  isLast: boolean;
  onRemove: (id: number) => void;
  onUpdate: (id: number, field: keyof ProductVariant, value: string) => void;
  variant: ProductVariant;
}>): JSX.Element {
  const t = useTranslations("admin.newProduct");

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onUpdate(variant.id, "name", e.target.value);
    },
    [onUpdate, variant.id]
  );

  const handlePriceChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onUpdate(variant.id, "price", e.target.value);
    },
    [onUpdate, variant.id]
  );

  const handleStockChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onUpdate(variant.id, "stock", e.target.value);
    },
    [onUpdate, variant.id]
  );

  const handleRemove = useCallback(() => {
    onRemove(variant.id);
  }, [onRemove, variant.id]);

  return (
    <div
      className={cn(
        "group grid grid-cols-[20px_1fr_1fr_110px_80px_28px] items-center gap-2 px-3 py-2 transition-colors hover:bg-secondary/20",
        !isLast && "border-b border-border/20"
      )}
    >
      <GripVertical className="size-3.5 cursor-grab text-muted-foreground/20" strokeWidth={1.5} />
      <input
        type="text"
        value={variant.name}
        onChange={handleNameChange}
        placeholder={t("variants.namePlaceholder")}
        className="h-8 rounded border-0 bg-transparent px-2 text-sm ring-1 ring-transparent transition-all placeholder:text-muted-foreground/30 hover:ring-border/40 focus:bg-background focus:ring-2 focus:ring-foreground/20 focus:outline-none"
      />
      <input
        type="text"
        placeholder={t("variants.valuePlaceholder")}
        className="h-8 rounded border-0 bg-transparent px-2 text-sm ring-1 ring-transparent transition-all placeholder:text-muted-foreground/30 hover:ring-border/40 focus:bg-background focus:ring-2 focus:ring-foreground/20 focus:outline-none"
      />
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground/30">$</span>
        <input
          type="text"
          value={variant.price}
          onChange={handlePriceChange}
          placeholder="0.00"
          className="h-8 w-full rounded border-0 bg-transparent pr-2 pl-6 font-mono text-sm ring-1 ring-transparent transition-all placeholder:text-muted-foreground/30 hover:ring-border/40 focus:bg-background focus:ring-2 focus:ring-foreground/20 focus:outline-none"
        />
      </div>
      <input
        type="text"
        value={variant.stock}
        onChange={handleStockChange}
        placeholder="0"
        className="h-8 rounded border-0 bg-transparent px-2 text-center font-mono text-sm ring-1 ring-transparent transition-all placeholder:text-muted-foreground/30 hover:ring-border/40 focus:bg-background focus:ring-2 focus:ring-foreground/20 focus:outline-none"
      />
      <button
        type="button"
        onClick={handleRemove}
        className="flex size-7 items-center justify-center rounded text-transparent transition-all group-hover:text-muted-foreground/40 hover:text-red-500!"
      >
        <Trash2 className="size-3" strokeWidth={1.5} />
      </button>
    </div>
  );
}

import { type ChangeEvent, type JSX, type KeyboardEvent, useCallback } from "react";

import { Package, Plus, X } from "lucide-react";
import { useTranslations } from "use-intl";

import { Badge } from "~/src/components/shadcn/badge";
import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent } from "~/src/components/shadcn/card";
import { Input } from "~/src/components/shadcn/input";
import { Label } from "~/src/components/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";
import { Switch } from "~/src/components/shadcn/switch";

interface ProductEditorSidebarProps {
  readonly onAddTag: () => void;
  readonly onRemoveTag: (tag: string) => void;
  readonly onStatusChange: (status: "draft" | "active" | "archived") => void;
  readonly onTagInputChange: (value: string) => void;
  readonly onTagInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  readonly status: "draft" | "active" | "archived";
  readonly tagInput: string;
  readonly tags: readonly string[];
}

const EMPTY_LENGTH = 0;

export function ProductEditorSidebar({
  onAddTag,
  onRemoveTag,
  onStatusChange,
  onTagInputChange,
  onTagInputKeyDown,
  status,
  tagInput,
  tags
}: Readonly<ProductEditorSidebarProps>): JSX.Element {
  const t = useTranslations("admin.newProduct");

  const statusLabel = {
    active: t("status.active"),
    archived: t("status.archived"),
    draft: t("status.draft")
  }[status];

  const handleTagInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onTagInputChange(e.target.value);
    },
    [onTagInputChange]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Package className="size-4 text-muted-foreground/60" strokeWidth={1.5} />
            <span className="text-[14px] font-medium">{t("status.title")}</span>
          </div>
          <div className="space-y-5">
            <div className="relative">
              <StatusSelect status={status} statusLabel={statusLabel} onStatusChange={onStatusChange} />
            </div>
            <div className="flex items-center justify-between border-t border-border/50 pt-5">
              <Label className="font-normal text-muted-foreground">{t("status.featured")}</Label>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <span className="mb-5 block text-[14px] font-medium">{t("tags.title")}</span>
          <div className="space-y-4">
            <TagInput
              tagInput={tagInput}
              handleTagInputChange={handleTagInputChange}
              onTagInputKeyDown={onTagInputKeyDown}
              onAddTag={onAddTag}
            />
            {tags.length > EMPTY_LENGTH && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <TagItem key={tag} tag={tag} onRemove={onRemoveTag} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <span className="mb-5 block text-[14px] font-medium">{t("inventory.title")}</span>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-normal text-muted-foreground">{t("inventory.trackInventory")}</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal text-muted-foreground">{t("inventory.sellWhenOOS")}</Label>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>

      <ShippingCard />
    </div>
  );
}

function ShippingCard(): JSX.Element {
  const t = useTranslations("admin.newProduct");

  return (
    <Card>
      <CardContent className="p-5">
        <span className="mb-5 block text-[14px] font-medium">{t("shipping.title")}</span>
        <div className="space-y-6">
          <FulfillmentTimeField />
          <WeightDimensionsField />
        </div>
        <div className="mt-5 flex items-center justify-between">
          <Label className="font-normal text-muted-foreground">{t("shipping.requiresShipping")}</Label>
          <Switch defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusSelect({
  status,
  statusLabel,
  onStatusChange
}: Readonly<{
  status: "draft" | "active" | "archived";
  statusLabel: string;
  onStatusChange: (status: "draft" | "active" | "archived") => void;
}>): JSX.Element {
  const t = useTranslations("admin.newProduct");

  const handleValueChange = useCallback(
    (val: "draft" | "active" | "archived" | null) => {
      if (val !== null) {
        onStatusChange(val);
      }
    },
    [onStatusChange]
  );

  return (
    <Select value={status} onValueChange={handleValueChange}>
      <SelectTrigger
        aria-label={t("status.title")}
        className="min-h-11 w-full min-w-0 rounded-none border-0 border-b border-border bg-background px-3 py-2.5 text-sm shadow-none ring-0 transition-[color,background-color,border-color] outline-none focus-visible:border-foreground focus-visible:ring-0 data-[state=open]:border-foreground [&>svg]:opacity-50"
      >
        <SelectValue>{statusLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="draft">{t("status.draft")}</SelectItem>
        <SelectItem value="active">{t("status.active")}</SelectItem>
        <SelectItem value="archived">{t("status.archived")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function TagItem({ tag, onRemove }: Readonly<{ tag: string; onRemove: (t: string) => void }>): JSX.Element {
  const handleRemove = useCallback(() => {
    onRemove(tag);
  }, [onRemove, tag]);

  return (
    <Badge variant="secondary" className="gap-1 rounded-md pr-1 text-[11px] font-normal">
      {tag}
      <button
        type="button"
        onClick={handleRemove}
        className="ml-0.5 flex size-3.5 items-center justify-center rounded-sm opacity-50 transition-opacity hover:opacity-100"
      >
        <X className="size-2.5" strokeWidth={2} />
      </button>
    </Badge>
  );
}

function TagInput({
  tagInput,
  handleTagInputChange,
  onTagInputKeyDown,
  onAddTag
}: Readonly<{
  tagInput: string;
  handleTagInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onTagInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onAddTag: () => void;
}>): JSX.Element {
  const t = useTranslations("admin.newProduct");
  return (
    <div className="flex gap-2">
      <Input
        type="text"
        value={tagInput}
        onChange={handleTagInputChange}
        onKeyDown={onTagInputKeyDown}
        placeholder={t("tags.placeholder")}
      />
      <Button variant="outline" size="icon" className="shrink-0" onClick={onAddTag}>
        <Plus className="size-4" strokeWidth={1.5} />
      </Button>
    </div>
  );
}

function FulfillmentTimeField(): JSX.Element {
  const t = useTranslations("admin.newProduct");
  return (
    <div className="space-y-2">
      <Label>{t("shipping.fulfillmentTime")}</Label>
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <Input type="number" placeholder="1" className="text-center font-mono" min={1} />
        <Select defaultValue="days">
          <SelectTrigger className="min-h-11 w-full min-w-0 rounded-none border-0 border-b border-border bg-background px-3 py-2.5 text-sm shadow-none ring-0 transition-[color,background-color,border-color] outline-none focus-visible:border-foreground focus-visible:ring-0 data-[state=open]:border-foreground [&>svg]:opacity-50">
            <SelectValue placeholder={t("shipping.unit")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="days">{t("shipping.days")}</SelectItem>
            <SelectItem value="weeks">{t("shipping.weeks")}</SelectItem>
            <SelectItem value="months">{t("shipping.months")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function WeightDimensionsField(): JSX.Element {
  const t = useTranslations("admin.newProduct");
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>{t("shipping.weight")}</Label>
        <div className="relative">
          <Input type="text" placeholder="0" className="pr-8 font-mono" />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground/50">g</span>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("shipping.dimensions")}</Label>
        <Input type="text" placeholder="L × W × H" className="font-mono" />
      </div>
    </div>
  );
}

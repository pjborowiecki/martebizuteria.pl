import { type JSX, useCallback, useMemo, useState } from "react"

import { cn } from "cn"
import { ChevronsUpDown, XIcon } from "lucide-react"
import { useTranslations } from "use-intl"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "~/src/presentation/components/shadcn/command"
import { Popover, PopoverContent, PopoverTrigger } from "~/src/presentation/components/shadcn/popover"
import { sheetSelectTriggerClassName } from "~/src/presentation/components/shadcn/sheet-control.styles"
const buildTriggerLabel = (
  selectedOptions: readonly CatalogEntityMultiSelectOption[],
  placeholder: string,
  selectedCountLabel: (count: number) => string,
): string => {
  if (selectedOptions.length === 0) {
    return placeholder
  }
  if (selectedOptions.length <= MAX_INLINE_LABELS) {
    return selectedOptions.map((option) => option.label).join(", ")
  }
  return selectedCountLabel(selectedOptions.length)
}
const CatalogEntityMultiSelectOptionItem = ({
  checked,
  label,
  onToggle,
  optionId,
}: Readonly<{
  checked: boolean
  label: string
  onToggle: (id: string) => void
  optionId: string
}>): JSX.Element => {
  const handleSelect = useCallback(() => {
    onToggle(optionId)
  }, [onToggle, optionId])
  return (
    <CommandItem data-checked={checked ? true : undefined} value={label} onSelect={handleSelect}>
      {label}
    </CommandItem>
  )
}
const CatalogEntityMultiSelectBadge = ({
  disabled,
  label,
  onRemove,
  optionId,
  removeLabel,
}: Readonly<{
  disabled: boolean
  label: string
  onRemove: (id: string) => void
  optionId: string
  removeLabel: string
}>): JSX.Element => {
  const handleRemove = useCallback(() => {
    onRemove(optionId)
  }, [onRemove, optionId])
  return (
    <Badge variant="secondary" className="gap-1 pr-1 font-normal">
      {label}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="size-4 text-muted-foreground hover:text-foreground"
        aria-label={removeLabel}
        disabled={disabled}
        onClick={handleRemove}
      >
        <XIcon className="size-3" />
      </Button>
    </Badge>
  )
}
export const CatalogEntityMultiSelect = ({
  ariaLabel,
  disabled = false,
  onChange,
  options,
  placeholder,
  selectedIds,
  showSelectedBadges = true,
}: Readonly<CatalogEntityMultiSelectProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.organization")
  const [open, setOpen] = useState(false)
  const optionsById = useMemo(() => new Map(options.map((option) => [option.id, option])), [options])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedOptions = useMemo(
    () =>
      selectedIds.flatMap((id) => {
        const option = optionsById.get(id)
        return option === undefined ? [] : [option]
      }),
    [optionsById, selectedIds],
  )
  const triggerLabel = useMemo(
    () =>
      buildTriggerLabel(selectedOptions, placeholder, (count) =>
        t("multiSelect.selectedCount", {
          count: String(count),
        }),
      ),
    [placeholder, selectedOptions, t],
  )
  const handleToggle = useCallback(
    (id: string) => {
      const next = new Set(selectedIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      onChange([...next])
    },
    [onChange, selectedIds],
  )
  const handleRemove = useCallback(
    (id: string) => {
      onChange(selectedIds.filter((selectedId) => selectedId !== id))
    },
    [onChange, selectedIds],
  )
  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground/80">—</p>
  }
  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            sheetSelectTriggerClassName,
            "flex w-full items-center justify-between font-normal disabled:cursor-not-allowed disabled:opacity-50",
            selectedOptions.length === 0 && "text-muted-foreground",
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) p-0">
          <Command>
            <CommandInput placeholder={t("multiSelect.searchPlaceholder")} />
            <CommandList>
              <CommandEmpty>{t("multiSelect.noResults")}</CommandEmpty>
              {options.map((option) => (
                <CatalogEntityMultiSelectOptionItem
                  key={option.id}
                  checked={selectedSet.has(option.id)}
                  label={option.label}
                  onToggle={handleToggle}
                  optionId={option.id}
                />
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showSelectedBadges && selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <CatalogEntityMultiSelectBadge
              key={option.id}
              disabled={disabled}
              label={option.label}
              onRemove={handleRemove}
              optionId={option.id}
              removeLabel={t("multiSelect.removeItem", {
                label: option.label,
              })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
export interface CatalogEntityMultiSelectOption {
  readonly id: string
  readonly label: string
}
interface CatalogEntityMultiSelectProps {
  readonly ariaLabel: string
  readonly disabled?: boolean
  readonly onChange: (ids: readonly string[]) => void
  readonly options: readonly CatalogEntityMultiSelectOption[]
  readonly placeholder: string
  readonly selectedIds: readonly string[]
  readonly showSelectedBadges?: boolean
}
const MAX_INLINE_LABELS = 2

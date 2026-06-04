import { type JSX, useCallback, useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";
import { Input } from "~/src/components/shadcn/input";
import { Label } from "~/src/components/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";
import { Separator } from "~/src/components/shadcn/separator";

interface Address {
  id: string;
  label: string;
  type: "shipping" | "billing";
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postal: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

const INITIAL_ADDRESSES: Address[] = [
  {
    city: "Warsaw",
    country: "Poland",
    id: "addr-1",
    isDefault: true,
    label: "home",
    line1: "ul. Marszałkowska 42/12",
    name: "Maria Kowalska",
    phone: "+48 512 345 678",
    postal: "00-624",
    type: "shipping"
  },
  {
    city: "Warsaw",
    country: "Poland",
    id: "addr-2",
    isDefault: false,
    label: "work",
    line1: "ul. Złota 59",
    line2: "Złote Tarasy, Floor 8",
    name: "Maria Kowalska",
    phone: "+48 512 345 678",
    postal: "00-120",
    type: "shipping"
  },
  {
    city: "Milan",
    country: "Italy",
    id: "addr-3",
    isDefault: false,
    label: "other",
    line1: "Via della Spiga 26",
    name: "Maria Kowalska",
    phone: "+39 02 7600 4388",
    postal: "20121",
    type: "billing"
  }
];

const FILTER_OPTIONS = ["shipping", "billing"] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

export const Route = createFileRoute("/{-$locale}/account/addresses")({
  component: AddressesPage
});

function AddressFormField({ colSpan, label, type }: Readonly<{ colSpan?: boolean; label: string; type: string }>): JSX.Element {
  return (
    <div className={colSpan === true ? "sm:col-span-2" : undefined}>
      <Label className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">{label}</Label>
      <Input variant="account" type={type} className="mt-1.5" />
    </div>
  );
}

function AddressForm({ onCancel }: Readonly<{ onCancel: () => void }>): JSX.Element {
  const t = useTranslations("pages.account.addresses");

  return (
    <div className="border-b border-border py-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <AddressFormField label={t("form.name")} type="text" />
        <AddressFormField label={t("form.phone")} type="tel" />
        <AddressFormField label={t("form.address")} type="text" colSpan />
        <AddressFormField label={t("form.city")} type="text" />
        <AddressFormField label={t("form.postal")} type="text" />
        <AddressFormField label={t("form.country")} type="text" />
        <div>
          <Label className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">{t("form.label")}</Label>
          <Select defaultValue="home">
            <SelectTrigger className="mt-1.5 flex h-auto w-full items-center justify-between rounded-none border-0 border-b border-border bg-transparent p-0 pb-2 text-[14px] shadow-none transition-colors outline-none hover:bg-transparent focus:border-foreground focus:ring-0 focus-visible:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">{t("labels.home")}</SelectItem>
              <SelectItem value="work">{t("labels.work")}</SelectItem>
              <SelectItem value="other">{t("labels.other")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-4">
        <Button variant="account" size="account">
          {t("form.save")}
        </Button>
        <Button variant="account-ghost" onClick={onCancel}>
          {t("form.cancel")}
        </Button>
      </div>
    </div>
  );
}

function AddressCard({ addr }: Readonly<{ addr: Address }>): JSX.Element {
  const t = useTranslations("pages.account.addresses");

  return (
    <div className="group flex gap-5 py-6">
      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.2} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[11px] tracking-[0.15em] uppercase">{t(`labels.${addr.label}`)}</p>
          {addr.isDefault && (
            <span className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              {"· "}
              {t("default")}
            </span>
          )}
        </div>
        <div className="mt-2 space-y-0.5 text-[13px] leading-relaxed text-muted-foreground">
          <p className="text-foreground">{addr.name}</p>
          <p>{addr.line1}</p>
          {addr.line2 !== undefined && addr.line2 !== "" && <p>{addr.line2}</p>}
          <p>
            {addr.postal} {addr.city}
          </p>
          <p>{addr.country}</p>
          <p className="pt-1">{addr.phone}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="ghost" size="icon-xs">
          <Pencil className="size-3.5" strokeWidth={1.5} />
        </Button>
        {!addr.isDefault && (
          <Button variant="ghost" size="icon-xs" className="hover:text-destructive">
            <Trash2 className="size-3.5" strokeWidth={1.5} />
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterButton({
  count,
  currentFilter,
  opt,
  setFilter
}: Readonly<{
  count: number;
  currentFilter: FilterOption;
  opt: FilterOption;
  setFilter: (f: FilterOption) => void;
}>): JSX.Element {
  const t = useTranslations("pages.account.addresses");
  const isActive = currentFilter === opt;
  const onClick = useCallback(() => {
    setFilter(opt);
  }, [opt, setFilter]);

  return (
    <Button
      variant="account-ghost"
      onClick={onClick}
      className={cn("tracking-[0.18em]", isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
    >
      {t(`filter.${opt}`)} ({count})
    </Button>
  );
}

function AddressesPage(): JSX.Element {
  const t = useTranslations("pages.account.addresses");
  const addresses = INITIAL_ADDRESSES;
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<FilterOption>("shipping");

  const handleToggleForm = useCallback(() => {
    setShowForm((prev) => !prev);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
  }, []);

  const filteredAddresses = useMemo(() => addresses.filter((addr) => addr.type === filter), [addresses, filter]);

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
      </div>

      <div className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {FILTER_OPTIONS.map((opt) => (
              <FilterButton
                key={opt}
                opt={opt}
                currentFilter={filter}
                setFilter={setFilter}
                count={addresses.filter((a) => a.type === opt).length}
              />
            ))}
          </div>
          <Button variant="account-ghost" onClick={handleToggleForm} className="flex items-center gap-1.5">
            <Plus className="size-3.5" strokeWidth={1.5} />
            {t("addNew")}
          </Button>
        </div>
        <Separator className="mt-4 mb-0" />
      </div>

      {/* Add form */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
          showForm ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <AddressForm onCancel={handleCancelForm} />
        </div>
      </div>

      {/* Address cards */}
      <div className="divide-y divide-border">
        {filteredAddresses.map((addr) => (
          <AddressCard key={addr.id} addr={addr} />
        ))}
      </div>
    </div>
  );
}

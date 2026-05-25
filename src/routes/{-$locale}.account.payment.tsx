"use client";

import { type JSX, useCallback, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";
import { Input } from "~/src/components/shadcn/input";
import { Label } from "~/src/components/shadcn/label";
import { Separator } from "~/src/components/shadcn/separator";

interface PaymentMethod {
  id: string;
  type: "visa" | "mastercard" | "amex";
  last4: string;
  expiry: string;
  name: string;
  isDefault: boolean;
}

const INITIAL_METHODS: PaymentMethod[] = [
  { expiry: "12/26", id: "pm-1", isDefault: true, last4: "4242", name: "Maria Kowalska", type: "visa" },
  { expiry: "09/25", id: "pm-2", isDefault: false, last4: "8529", name: "Maria Kowalska", type: "mastercard" },
  { expiry: "04/27", id: "pm-3", isDefault: false, last4: "3782", name: "Maria Kowalska", type: "amex" }
];

const CARD_BRANDS: Record<string, string> = {
  amex: "American Express",
  mastercard: "Mastercard",
  visa: "Visa"
};

export const Route = createFileRoute("/{-$locale}/account/payment")({
  component: PaymentPage
});

function PaymentFormField({
  colSpan,
  label,
  placeholder,
  tabular,
  type
}: Readonly<{
  colSpan?: boolean;
  label: string;
  placeholder?: string;
  tabular?: boolean;
  type: string;
}>): JSX.Element {
  return (
    <div className={colSpan === true ? "sm:col-span-2" : undefined}>
      <Label className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">{label}</Label>
      <Input variant="account" type={type} placeholder={placeholder} className={cn("mt-1.5", tabular === true && "tabular-nums")} />
    </div>
  );
}

function PaymentForm({ onCancel }: Readonly<{ onCancel: () => void }>): JSX.Element {
  const t = useTranslations("account.payment");

  return (
    <div className="border-b border-border py-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <PaymentFormField label={t("form.cardNumber")} type="text" placeholder="1234 5678 9012 3456" tabular colSpan />
        <PaymentFormField label={t("form.name")} type="text" />
        <div className="grid grid-cols-2 gap-4">
          <PaymentFormField label={t("form.expiry")} type="text" placeholder="MM/YY" tabular />
          <PaymentFormField label={t("form.cvv")} type="text" placeholder="123" tabular />
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

function PaymentCard({ method }: Readonly<{ method: PaymentMethod }>): JSX.Element {
  const t = useTranslations("account.payment");

  return (
    <div className="group flex items-center gap-5 py-5">
      <div className="flex size-12 shrink-0 items-center justify-center bg-muted/50">
        <CreditCard className="size-5 text-muted-foreground" strokeWidth={1.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] tracking-[0.02em]">
            {CARD_BRANDS[method.type]} {"•••• "}
            {method.last4}
          </p>
          {method.isDefault && (
            <span className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              {"· "}
              {t("default")}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t("expires")} {method.expiry} {"· "}
          {method.name}
        </p>
      </div>
      <div className="flex shrink-0 gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        {!method.isDefault && <Button variant="account-ghost">{t("makeDefault")}</Button>}
        <Button variant="ghost" size="icon-xs" className="hover:text-destructive">
          <Trash2 className="size-3.5" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}

function PaymentPage(): JSX.Element {
  const t = useTranslations("account.payment");
  const methods = INITIAL_METHODS;
  const [showForm, setShowForm] = useState(false);

  const handleToggleForm = useCallback(() => {
    setShowForm((prev) => !prev);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
  }, []);

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
      </div>

      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          {t("saved")} ({methods.length})
        </h2>
        <Button variant="account-ghost" onClick={handleToggleForm} className="flex items-center gap-1.5">
          <Plus className="size-3.5" strokeWidth={1.5} />
          {t("addNew")}
        </Button>
      </div>
      <Separator className="mt-3 mb-0" />

      {/* Add form */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
          showForm ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <PaymentForm onCancel={handleCancelForm} />
        </div>
      </div>

      {/* Cards list */}
      <div className="divide-y divide-border">
        {methods.map((method) => (
          <PaymentCard key={method.id} method={method} />
        ))}
      </div>

      <Separator className="my-10" />

      <div className="space-y-2">
        <p className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase">{t("securityNote")}</p>
        <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground/70">{t("securityDesc")}</p>
      </div>
    </div>
  );
}

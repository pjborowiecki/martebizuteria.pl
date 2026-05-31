import { type ChangeEvent, type Dispatch, type JSX, type SetStateAction, useCallback, useRef, useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { authClient } from "~/src/integrations/better-auth/auth._client";
import { useTimeZone } from "~/src/integrations/use-intl/i18n.timezone";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";
import { Input } from "~/src/components/shadcn/input";
import { Label } from "~/src/components/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";
import { Separator } from "~/src/components/shadcn/separator";
import { Switch } from "~/src/components/shadcn/switch";

const PROFILE = {
  birthDate: "March 15, 1992",
  currency: "EUR",
  email: "maria.kowalska@email.com",
  firstName: "Maria",
  language: "English",
  lastName: "Kowalska",
  newsletter: true,
  phone: "+48 512 345 678"
};

type FieldKey = "firstName" | "lastName" | "email" | "phone" | "birthDate";

export const Route = createFileRoute("/{-$locale}/account/profile")({
  component: ProfilePage
});

function PersonalInfoField({
  editing,
  field,
  onCancel,
  onSave,
  setEditing,
  setValues,
  values
}: Readonly<{
  editing: FieldKey | undefined;
  field: { key: FieldKey; label: string; type: string };
  onCancel: (key: FieldKey) => void;
  onSave: () => void;
  setEditing: (key: FieldKey | undefined) => void;
  setValues: Dispatch<SetStateAction<typeof PROFILE>>;
  values: typeof PROFILE;
}>): JSX.Element {
  const isEditing = editing === field.key;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [field.key]: e.target.value }));
    },
    [field.key, setValues]
  );

  const handleEdit = useCallback(() => {
    setEditing(field.key);
  }, [field.key, setEditing]);

  const handleCancel = useCallback(() => {
    onCancel(field.key);
  }, [field.key, onCancel]);

  return (
    <div className="flex items-center gap-4 py-4">
      <div className="min-w-0 flex-1">
        <Label className="text-[11px] tracking-widest text-muted-foreground uppercase">{field.label}</Label>
        <Input
          variant="account-inline"
          type={field.type}
          value={values[field.key]}
          readOnly={!isEditing}
          onChange={handleChange}
          className={cn("mt-1 block", isEditing ? "cursor-text text-foreground" : "pointer-events-none cursor-default text-foreground")}
        />
      </div>
      {isEditing ? (
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon-xs" onClick={onSave} className="text-foreground hover:text-foreground">
            <Save className="size-3.5" strokeWidth={1.5} />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={handleCancel} className="text-muted-foreground hover:text-destructive">
            <X className="size-3.5" strokeWidth={1.5} />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="icon-xs" onClick={handleEdit}>
          <Pencil className="size-3.5" strokeWidth={1.5} />
        </Button>
      )}
    </div>
  );
}

function PersonalInfoSection(): JSX.Element {
  const t = useTranslations("account.profile");
  const [editing, setEditing] = useState<FieldKey | undefined>();
  const [values, setValues] = useState(PROFILE);
  const snapshotRef = useRef<typeof PROFILE>(PROFILE);

  const handleSetEditing = useCallback(
    (key: FieldKey | undefined) => {
      if (key !== undefined) {
        snapshotRef.current = { ...values };
      }
      setEditing(key);
    },
    [values]
  );

  const handleSave = useCallback(() => {
    setEditing(undefined);
  }, []);

  const handleCancel = useCallback((key: FieldKey) => {
    setValues((v) => ({ ...v, [key]: snapshotRef.current[key] }));
    setEditing(undefined);
  }, []);

  const fields: { key: FieldKey; label: string; type: string }[] = [
    { key: "firstName", label: t("firstName"), type: "text" },
    { key: "lastName", label: t("lastName"), type: "text" },
    { key: "email", label: t("email"), type: "email" },
    { key: "phone", label: t("phone"), type: "tel" },
    { key: "birthDate", label: t("birthDate"), type: "text" }
  ];

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("personalInfo")}</h2>
      <Separator className="mt-3 mb-0" />

      <div className="divide-y divide-border">
        {fields.map((field) => (
          <PersonalInfoField
            key={field.key}
            field={field}
            editing={editing}
            setEditing={handleSetEditing}
            values={values}
            setValues={setValues}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ))}
      </div>
    </section>
  );
}

const LANGUAGE_OPTIONS = [
  { label: "Polski", value: "pl" },
  { label: "English", value: "en" },
  { label: "Deutsch", value: "de" },
  { label: "Français", value: "fr" }
] as const;

const CURRENCY_OPTIONS = [
  { label: "EUR (€)", value: "EUR" },
  { label: "PLN (zł)", value: "PLN" },
  { label: "USD ($)", value: "USD" },
  { label: "GBP (£)", value: "GBP" }
] as const;

const PREF_SELECT_TRIGGER_CLASS =
  "mt-1.5 flex h-auto w-full items-center justify-between rounded-none border-0 border-b border-border bg-transparent p-0 pb-2 text-[14px] shadow-none transition-colors outline-none hover:bg-transparent focus:border-foreground focus:ring-0 focus-visible:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-foreground";

const TIMEZONE_OPTIONS: readonly string[] =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : CONSTANTS.TIME_ZONES;

function TimezoneField(): JSX.Element {
  const t = useTranslations("account.profile");
  const current = useTimeZone();

  const mutation = useMutation({
    mutationFn: async (timezone: string) => {
      const { error } = await authClient.updateUser({ timezone });
      if (error) {
        throw new Error(error.message ?? "Failed to update timezone");
      }
    },
    onError: () => {
      toast.error(t("timezoneError"));
    },
    onSuccess: () => {
      toast.success(t("timezoneSaved"));
    }
  });

  const { mutate } = mutation;

  const handleChange = useCallback(
    (val: string | null) => {
      if (val !== null && val !== current) {
        mutate(val);
      }
    },
    [current, mutate]
  );

  return (
    <div className="py-4">
      <Label className="text-[11px] tracking-widest text-muted-foreground uppercase">{t("timezone")}</Label>
      <Select value={current} onValueChange={handleChange} disabled={mutation.isPending}>
        <SelectTrigger className={PREF_SELECT_TRIGGER_CLASS}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIMEZONE_OPTIONS.map((tz) => (
            <SelectItem key={tz} value={tz}>
              {tz}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PreferencesSection(): JSX.Element {
  const t = useTranslations("account.profile");
  const [values, setValues] = useState(PROFILE);

  const handleLanguageChange = useCallback((val: string | null) => {
    if (val !== null) {
      setValues((v) => ({ ...v, language: val }));
    }
  }, []);

  const handleCurrencyChange = useCallback((val: string | null) => {
    if (val !== null) {
      setValues((v) => ({ ...v, currency: val }));
    }
  }, []);

  const toggleNewsletter = useCallback(() => {
    setValues((v) => ({ ...v, newsletter: !v.newsletter }));
  }, []);

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("preferences")}</h2>
      <Separator className="mt-3 mb-0" />

      <div className="divide-y divide-border">
        <div className="py-4">
          <Label className="text-[11px] tracking-widest text-muted-foreground uppercase">{t("language")}</Label>
          <Select value={values.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className={PREF_SELECT_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="py-4">
          <Label className="text-[11px] tracking-widest text-muted-foreground uppercase">{t("currency")}</Label>
          <Select value={values.currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className={PREF_SELECT_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TimezoneField />

        <div className="flex items-center justify-between py-4">
          <div>
            <Label className="text-[11px] tracking-widest text-muted-foreground uppercase">{t("newsletter")}</Label>
            <p className="mt-1 text-[14px]">{values.newsletter ? t("subscribed") : t("notSubscribed")}</p>
          </div>
          <Switch checked={values.newsletter} onCheckedChange={toggleNewsletter} />
        </div>
      </div>
    </section>
  );
}

function SecuritySection(): JSX.Element {
  const t = useTranslations("account.profile");

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("security")}</h2>
      <Separator className="mt-3 mb-0" />

      <div className="divide-y divide-border">
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-[14px]">{t("changePassword")}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{t("changePasswordDesc")}</p>
          </div>
          <Button variant="account-ghost">{t("update")}</Button>
        </div>
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-[14px]">{t("twoFactor")}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{t("twoFactorDesc")}</p>
          </div>
          <Button variant="account-ghost">{t("enable")}</Button>
        </div>
      </div>
    </section>
  );
}

function CloseAccountDialog({
  canConfirmClose,
  closeConfirmation,
  onCancel,
  onCloseAccount,
  setCloseConfirmation
}: Readonly<{
  canConfirmClose: boolean;
  closeConfirmation: string;
  onCancel: () => void;
  onCloseAccount: () => void;
  setCloseConfirmation: (val: string) => void;
}>): JSX.Element {
  const t = useTranslations("account.profile");

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setCloseConfirmation(e.target.value);
    },
    [setCloseConfirmation]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 mx-4 w-full max-w-md bg-background p-8 shadow-lg ring-1 ring-border/50">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-destructive" strokeWidth={1.5} />
            <h3 className="text-[14px]">{t("closeDialogTitle")}</h3>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{t("closeDialogDesc")}</p>
          <ul className="space-y-1.5 pl-4 text-[12px] leading-relaxed text-muted-foreground">
            <li className="list-disc">{t("closeDialogPoint1")}</li>
            <li className="list-disc">{t("closeDialogPoint2")}</li>
            <li className="list-disc">{t("closeDialogPoint3")}</li>
          </ul>
          <div className="mt-4">
            <Label className="text-[11px] tracking-widest text-muted-foreground uppercase">{t("closeDialogConfirm")}</Label>
            <Input
              variant="account"
              type="text"
              value={closeConfirmation}
              onChange={handleChange}
              placeholder="DELETE"
              className="mt-1.5"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="destructive"
              size="account-sm"
              disabled={!canConfirmClose}
              onClick={onCloseAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-30"
            >
              {t("closeAccountAction")}
            </Button>
            <Button variant="account-ghost" onClick={onCancel}>
              {t("closeDialogCancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloseAccountSection(): JSX.Element {
  const t = useTranslations("account.profile");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeConfirmation, setCloseConfirmation] = useState("");

  const canConfirmClose = closeConfirmation.toLowerCase() === "delete";

  const handleCloseAccount = useCallback(() => {
    if (canConfirmClose) {
      setShowCloseDialog(false);
      setCloseConfirmation("");
    }
  }, [canConfirmClose]);

  const handleCancel = useCallback(() => {
    setShowCloseDialog(false);
    setCloseConfirmation("");
  }, []);

  const handleShowDialog = useCallback(() => {
    setShowCloseDialog(true);
  }, []);

  return (
    <>
      <section>
        <h2 className="text-[11px] tracking-[0.2em] text-destructive/70 uppercase">{t("closeAccount")}</h2>
        <Separator className="mt-3 mb-0" />

        <div className="py-5">
          <div className="flex items-start gap-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive/60" strokeWidth={1.5} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px]">{t("closeAccountTitle")}</p>
              <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-muted-foreground">{t("closeAccountDesc")}</p>
              <Button variant="account-destructive" size="account-sm" className="mt-4" onClick={handleShowDialog}>
                {t("closeAccountAction")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {showCloseDialog ? (
        <CloseAccountDialog
          canConfirmClose={canConfirmClose}
          closeConfirmation={closeConfirmation}
          onCancel={handleCancel}
          onCloseAccount={handleCloseAccount}
          setCloseConfirmation={setCloseConfirmation}
        />
      ) : undefined}
    </>
  );
}

function ProfilePage(): JSX.Element {
  const t = useTranslations("account.profile");

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
      </div>

      <PersonalInfoSection />
      <Separator className="my-10" />

      <PreferencesSection />
      <Separator className="my-10" />

      <SecuritySection />
      <Separator className="my-10" />

      <CloseAccountSection />
    </div>
  );
}

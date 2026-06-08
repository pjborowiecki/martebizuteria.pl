import { type ChangeEvent, type JSX, useCallback, useRef, useState } from "react";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
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

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants";
import { customerAccountMutations } from "~/src/modules/customer-account/customer-account.mutations";
import { customerAccountQueryOptions } from "~/src/modules/customer-account/customer-account.queries";
import type { CustomerAccountProfile } from "~/src/modules/customer-account/customer-account.types";

type EditableField = "name" | "phone";

export const Route = createFileRoute("/{-$locale}/account/profile")({
  component: ProfilePage,
  loader: ({ context }) => context.queryClient.ensureQueryData(customerAccountQueryOptions.profileQueryOptions()),
  staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS
});

const PREF_SELECT_TRIGGER_CLASS =
  "mt-1.5 flex h-auto w-full items-center justify-between rounded-none border-0 border-b border-border bg-transparent p-0 pb-2 text-[14px] shadow-none transition-colors outline-none hover:bg-transparent focus:border-foreground focus:ring-0 focus-visible:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-foreground";

const TIMEZONE_OPTIONS: readonly string[] =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : CONSTANTS.TIME_ZONES;

function ProfilePage(): JSX.Element {
  const t = useTranslations("pages.account.profile");
  const { data: profile } = useSuspenseQuery(customerAccountQueryOptions.profileQueryOptions());

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
      </div>

      <PersonalInfoSection profile={profile} />
      <Separator className="my-10" />

      <PreferencesSection />
      <Separator className="my-10" />

      <SecuritySection />
      <Separator className="my-10" />

      <CloseAccountSection />
    </div>
  );
}

function PersonalInfoSection({ profile }: Readonly<{ profile: CustomerAccountProfile | undefined }>): JSX.Element {
  const t = useTranslations("pages.account.profile");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EditableField | undefined>();
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const snapshotRef = useRef({ name, phone });

  const updatePhoneMutation = useMutation({
    mutationFn: (nextPhone: string) => customerAccountMutations.updateCustomerPhoneFn({ data: { phone: nextPhone } }),
    onError: () => {
      toast.error(t("saveError"));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.CUSTOMER_ACCOUNT.PROFILE });
      toast.success(t("saved"));
    }
  });

  const handleStartEdit = useCallback(
    (field: EditableField) => {
      snapshotRef.current = { name, phone };
      setEditing(field);
    },
    [name, phone]
  );

  const handleCancel = useCallback((field: EditableField) => {
    if (field === "name") {
      setName(snapshotRef.current.name);
    } else {
      setPhone(snapshotRef.current.phone);
    }
    setEditing(undefined);
  }, []);

  const handleSave = useCallback(
    async (field: EditableField) => {
      if (field === "name") {
        const { error } = await authClient.updateUser({ name });
        if (error) {
          toast.error(t("saveError"));
          return;
        }
        toast.success(t("saved"));
      } else {
        await updatePhoneMutation.mutateAsync(phone);
      }
      setEditing(undefined);
    },
    [name, phone, t, updatePhoneMutation]
  );

  const handleCancelName = useCallback(() => {
    handleCancel("name");
  }, [handleCancel]);

  const handleCancelPhone = useCallback(() => {
    handleCancel("phone");
  }, [handleCancel]);

  const handleEditName = useCallback(() => {
    handleStartEdit("name");
  }, [handleStartEdit]);

  const handleEditPhone = useCallback(() => {
    handleStartEdit("phone");
  }, [handleStartEdit]);

  const handleSaveName = useCallback(() => {
    void handleSave("name");
  }, [handleSave]);

  const handleSavePhone = useCallback(() => {
    void handleSave("phone");
  }, [handleSave]);

  if (profile === undefined) {
    return <p className="text-sm text-muted-foreground">{t("saveError")}</p>;
  }

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("personalInfo")}</h2>
      <Separator className="mt-3 mb-0" />
      <div className="divide-y divide-border">
        <ProfileField
          editing={editing === "name"}
          label={t("name")}
          onCancel={handleCancelName}
          onEdit={handleEditName}
          onSave={handleSaveName}
          onChange={setName}
          type="text"
          value={name}
        />
        <ReadOnlyField label={t("email")} value={profile.email} />
        <ProfileField
          editing={editing === "phone"}
          label={t("phone")}
          onCancel={handleCancelPhone}
          onEdit={handleEditPhone}
          onSave={handleSavePhone}
          onChange={setPhone}
          type="tel"
          value={phone}
        />
      </div>
    </section>
  );
}

function ProfileField({
  editing,
  label,
  onCancel,
  onChange,
  onEdit,
  onSave,
  type,
  value
}: Readonly<{
  editing: boolean;
  label: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  type: string;
  value: string;
}>): JSX.Element {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="flex items-center gap-4 py-4">
      <div className="min-w-0 flex-1">
        <Label className="text-[11px] tracking-widest text-muted-foreground uppercase">{label}</Label>
        <Input
          variant="account-inline"
          type={type}
          value={value}
          readOnly={!editing}
          onChange={handleChange}
          className={cn("mt-1 block", editing ? "cursor-text text-foreground" : "pointer-events-none cursor-default text-foreground")}
        />
      </div>
      {editing ? (
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon-xs" onClick={onSave} className="text-foreground hover:text-foreground">
            <Save className="size-3.5" strokeWidth={1.5} />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onCancel} className="text-muted-foreground hover:text-destructive">
            <X className="size-3.5" strokeWidth={1.5} />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="icon-xs" onClick={onEdit}>
          <Pencil className="size-3.5" strokeWidth={1.5} />
        </Button>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: Readonly<{ label: string; value: string }>): JSX.Element {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="min-w-0 flex-1">
        <Label className="text-[11px] tracking-widest text-muted-foreground uppercase">{label}</Label>
        <Input
          variant="account-inline"
          type="email"
          value={value}
          readOnly
          className="pointer-events-none mt-1 block cursor-default text-foreground"
        />
      </div>
    </div>
  );
}

function TimezoneField(): JSX.Element {
  const t = useTranslations("pages.account.profile");
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

  const handleChange = useCallback(
    (val: string | null) => {
      if (val !== null && val !== current) {
        mutation.mutate(val);
      }
    },
    [current, mutation]
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
  const t = useTranslations("pages.account.profile");

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("preferences")}</h2>
      <Separator className="mt-3 mb-0" />
      <div className="divide-y divide-border">
        <TimezoneField />
      </div>
    </section>
  );
}

function SecuritySection(): JSX.Element {
  const t = useTranslations("pages.account.profile");

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
  const t = useTranslations("pages.account.profile");

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
  const t = useTranslations("pages.account.profile");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeConfirmation, setCloseConfirmation] = useState("");
  const canConfirmClose = closeConfirmation.toLowerCase() === "delete";

  const handleOpenDialog = useCallback(() => {
    setShowCloseDialog(true);
  }, []);

  const handleCancelDialog = useCallback(() => {
    setShowCloseDialog(false);
    setCloseConfirmation("");
  }, []);

  const handleCloseAccount = useCallback(() => {
    if (canConfirmClose) {
      setShowCloseDialog(false);
      setCloseConfirmation("");
    }
  }, [canConfirmClose]);

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
              <Button variant="account-destructive" size="account-sm" className="mt-4" onClick={handleOpenDialog}>
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
          onCancel={handleCancelDialog}
          onCloseAccount={handleCloseAccount}
          setCloseConfirmation={setCloseConfirmation}
        />
      ) : undefined}
    </>
  );
}

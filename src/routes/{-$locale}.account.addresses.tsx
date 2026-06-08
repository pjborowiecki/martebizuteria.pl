import { type ChangeEvent, type DOMAttributes, type JSX, useCallback, useState } from "react";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";
import { Input } from "~/src/components/shadcn/input";
import { Label } from "~/src/components/shadcn/label";
import { Separator } from "~/src/components/shadcn/separator";

import { addressMutations } from "~/src/modules/address/address.mutations";
import { addressQueryOptions } from "~/src/modules/address/address.queries";
import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants";
import type { CustomerAccountAddress } from "~/src/modules/customer-account/customer-account.types";

export const Route = createFileRoute("/{-$locale}/account/addresses")({
  component: AddressesPage,
  loader: ({ context }) => context.queryClient.ensureQueryData(addressQueryOptions.userAddressesQueryOptions()),
  staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS
});

const EMPTY_LENGTH = 0;
const COUNTRY_CODE_LENGTH = 2;

interface AddressFormState {
  address1: string;
  address2: string;
  city: string;
  countryCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  postalCode: string;
  province: string;
}

const EMPTY_FORM: AddressFormState = {
  address1: "",
  address2: "",
  city: "",
  countryCode: "PL",
  firstName: "",
  lastName: "",
  phone: "",
  postalCode: "",
  province: ""
};

function AddressesPage(): JSX.Element {
  const t = useTranslations("pages.account.addresses");
  const { data: addresses } = useSuspenseQuery(addressQueryOptions.userAddressesQueryOptions());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();

  const handleToggleForm = useCallback(() => {
    setEditingId(undefined);
    setShowForm((prev) => !prev);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingId(undefined);
  }, []);

  const handleSavedForm = useCallback(() => {
    setShowForm(false);
    setEditingId(undefined);
  }, []);

  const handleEditAddress = useCallback((addressId: string) => {
    setEditingId(addressId);
    setShowForm(true);
  }, []);

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
      </div>

      <div className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            {t("saved")} ({addresses.length})
          </h2>
          <Button variant="account-ghost" onClick={handleToggleForm} className="flex items-center gap-1.5">
            <Plus className="size-3.5" strokeWidth={1.5} />
            {t("addNew")}
          </Button>
        </div>
        <Separator className="mt-4 mb-0" />
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
          showForm ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <AddressForm
            addressId={editingId}
            initial={editingId === undefined ? EMPTY_FORM : formStateFromAddress(addresses.find((a) => a.id === editingId))}
            onCancel={handleCancelForm}
            onSaved={handleSavedForm}
          />
        </div>
      </div>

      {addresses.length === EMPTY_LENGTH ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="divide-y divide-border">
          {addresses.map((addr) => (
            <AddressCard key={addr.id} addr={addr} onEdit={handleEditAddress} />
          ))}
        </div>
      )}
    </div>
  );
}

function formStateFromAddress(addr: CustomerAccountAddress | undefined): AddressFormState {
  if (addr === undefined) {
    return EMPTY_FORM;
  }

  return {
    address1: addr.address1,
    address2: addr.address2 ?? "",
    city: addr.city,
    countryCode: addr.countryCode,
    firstName: addr.firstName ?? "",
    lastName: addr.lastName ?? "",
    phone: addr.phone ?? "",
    postalCode: addr.postalCode ?? "",
    province: addr.province ?? ""
  };
}

function AddressForm({
  addressId,
  initial,
  onCancel,
  onSaved
}: Readonly<{
  addressId?: string;
  initial: AddressFormState;
  onCancel: () => void;
  onSaved: () => void;
}>): JSX.Element {
  const t = useTranslations("pages.account.addresses");
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        address1: form.address1,
        address2: form.address2 === "" ? undefined : form.address2,
        city: form.city,
        countryCode: form.countryCode,
        firstName: form.firstName === "" ? undefined : form.firstName,
        isDefault: addressId === undefined ? addressesShouldDefault() : undefined,
        lastName: form.lastName === "" ? undefined : form.lastName,
        phone: form.phone === "" ? undefined : form.phone,
        postalCode: form.postalCode === "" ? undefined : form.postalCode,
        province: form.province === "" ? undefined : form.province
      };

      if (addressId === undefined) {
        return addressMutations.createUserAddressFn({ data: payload });
      }

      return addressMutations.updateUserAddressFn({ data: { ...payload, addressId } });
    },
    onError: () => {
      toast.error(t("saveError"));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.ADDRESS.ALL });
      toast.success(t("saved"));
      onSaved();
    }
  });

  function addressesShouldDefault(): boolean {
    const cached = queryClient.getQueryData<CustomerAccountAddress[]>(CONSTANTS.QUERY_KEYS.ADDRESS.ALL);
    return cached === undefined || cached.length === EMPTY_LENGTH;
  }

  const handleSubmit = useCallback<NonNullable<DOMAttributes<HTMLFormElement>["onSubmit"]>>(
    (e) => {
      e.preventDefault();
      mutation.mutate();
    },
    [mutation]
  );

  const setField = useCallback(
    (field: keyof AddressFormState): ((e: ChangeEvent<HTMLInputElement>) => void) =>
      (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
      },
    []
  );

  return (
    <form onSubmit={handleSubmit} className="border-b border-border py-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <AddressFormField label={t("form.name")} value={form.firstName} onChange={setField("firstName")} />
        <AddressFormField label={t("form.phone")} type="tel" value={form.phone} onChange={setField("phone")} />
        <AddressFormField label={t("form.address")} value={form.address1} onChange={setField("address1")} colSpan />
        <AddressFormField label={t("form.city")} value={form.city} onChange={setField("city")} />
        <AddressFormField label={t("form.postal")} value={form.postalCode} onChange={setField("postalCode")} />
        <AddressFormField
          label={t("form.country")}
          value={form.countryCode}
          onChange={setField("countryCode")}
          maxLength={COUNTRY_CODE_LENGTH}
        />
      </div>
      <div className="mt-6 flex items-center gap-4">
        <Button variant="account" size="account" type="submit" disabled={mutation.isPending}>
          {t("form.save")}
        </Button>
        <Button variant="account-ghost" type="button" onClick={onCancel}>
          {t("form.cancel")}
        </Button>
      </div>
    </form>
  );
}

function AddressFormField({
  colSpan,
  label,
  maxLength,
  onChange,
  type = "text",
  value
}: Readonly<{
  colSpan?: boolean;
  label: string;
  maxLength?: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  value: string;
}>): JSX.Element {
  return (
    <div className={colSpan === true ? "sm:col-span-2" : undefined}>
      <Label className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">{label}</Label>
      <Input variant="account" type={type} className="mt-1.5" value={value} onChange={onChange} maxLength={maxLength} />
    </div>
  );
}

function AddressCard({ addr, onEdit }: Readonly<{ addr: CustomerAccountAddress; onEdit: (addressId: string) => void }>): JSX.Element {
  const t = useTranslations("pages.account.addresses");
  const queryClient = useQueryClient();
  const name = [addr.firstName, addr.lastName]
    .filter((part) => part !== null && part !== "")
    .join(" ")
    .trim();

  const deleteMutation = useMutation({
    mutationFn: () => addressMutations.deleteUserAddressFn({ data: { addressId: addr.id } }),
    onError: () => {
      toast.error(t("deleteError"));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.ADDRESS.ALL });
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: () => addressMutations.setDefaultUserAddressFn({ data: { addressId: addr.id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.ADDRESS.ALL });
    }
  });

  const handleEdit = useCallback(() => {
    onEdit(addr.id);
  }, [addr.id, onEdit]);

  const handleSetDefault = useCallback(() => {
    setDefaultMutation.mutate();
  }, [setDefaultMutation]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate();
  }, [deleteMutation]);

  return (
    <div className="group flex gap-5 py-6">
      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.2} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {addr.isDefault ? (
            <span className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">{t("default")}</span>
          ) : (
            <Button variant="account-ghost" onClick={handleSetDefault} disabled={setDefaultMutation.isPending}>
              {t("makeDefault")}
            </Button>
          )}
        </div>
        <div className="mt-2 space-y-0.5 text-[13px] leading-relaxed text-muted-foreground">
          {name === "" ? undefined : <p className="text-foreground">{name}</p>}
          <p>{addr.address1}</p>
          {addr.address2 !== null && addr.address2 !== "" ? <p>{addr.address2}</p> : undefined}
          <p>
            {addr.postalCode} {addr.city}
          </p>
          <p>{addr.countryCode}</p>
          {addr.phone !== null && addr.phone !== "" ? <p className="pt-1">{addr.phone}</p> : undefined}
        </div>
      </div>
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="ghost" size="icon-xs" onClick={handleEdit}>
          <Pencil className="size-3.5" strokeWidth={1.5} />
        </Button>
        {addr.isDefault ? undefined : (
          <Button variant="ghost" size="icon-xs" className="hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="size-3.5" strokeWidth={1.5} />
          </Button>
        )}
      </div>
    </div>
  );
}

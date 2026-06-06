import {
  type BaseSyntheticEvent,
  createContext,
  type JSX,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef
} from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Control, type UseFormGetValues, type UseFormSetValue, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import {
  createDefaultCustomerFormValues,
  customerToFormValues
} from "~/src/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form.utils";

import { userMutations } from "~/src/modules/user/user.mutations";
import type { User } from "~/src/modules/user/user.types";
import { userZodSchemas } from "~/src/modules/user/user.zod";

export const CUSTOMER_FORM_ID = "customer-form";

export interface CustomerFormContextValue {
  readonly control: Control<User["adminCustomerFormValues"]>;
  readonly customer: User["adminCustomerDetail"];
  readonly dismiss: () => void;
  readonly getValues: UseFormGetValues<User["adminCustomerFormValues"]>;
  readonly isPending: boolean;
  readonly onFormSubmit: (e?: BaseSyntheticEvent) => void;
  readonly registerCommitPendingTag: (commit: () => void) => void;
  readonly setValue: UseFormSetValue<User["adminCustomerFormValues"]>;
}

const CustomerFormContext = createContext<CustomerFormContextValue | undefined>(undefined);

interface CustomerFormProviderProps {
  readonly children: ReactNode;
  readonly customer: User["adminCustomerDetail"];
  readonly onDismiss: () => void;
  readonly onSuccess: () => void;
  readonly open: boolean;
}

export function CustomerFormProvider({ children, customer, onDismiss, onSuccess, open }: Readonly<CustomerFormProviderProps>): JSX.Element {
  const t = useTranslations("pages.admin.customerDetail.form");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const defaultValues = useMemo(() => (open ? customerToFormValues(customer) : createDefaultCustomerFormValues()), [customer, open]);

  const { control, getValues, handleSubmit, reset, setValue } = useForm<User["adminCustomerFormValues"]>({
    defaultValues,
    resolver: zodResolver(userZodSchemas.adminCustomerFormValues)
  });

  const commitPendingTagRef = useRef<() => void>(() => {});

  const registerCommitPendingTag = useCallback((commit: () => void) => {
    commitPendingTagRef.current = commit;
  }, []);

  useEffect(() => {
    if (open) {
      reset(customerToFormValues(customer));
    }
  }, [customer, open, reset]);

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [...CONSTANTS.QUERY_KEYS.USER.ADMIN.CUSTOMER_BY_ID, customer.id, locale]
      }),
      queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.USER.ADMIN.CUSTOMERS }),
      queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.USER.ADMIN.CUSTOMERS_PAGE }),
      queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.USER.ADMIN.CUSTOMER_STATS })
    ]);
  }, [customer.id, locale, queryClient]);

  const updateMutation = useMutation({
    mutationFn: (values: User["adminCustomerFormValues"]) => userMutations.updateAdminCustomerFn({ data: { id: customer.id, values } }),
    onError: () => {
      toast.error(t("toast.errorTitle"), {
        description: t("toast.errorDescription")
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success(t("toast.successTitle"), {
        description: t("toast.successDescription")
      });
      onSuccess();
    }
  });

  const onFormSubmit = useCallback(
    (e?: BaseSyntheticEvent) => {
      commitPendingTagRef.current();
      void handleSubmit((values) => {
        updateMutation.mutate(values);
      })(e);
    },
    [handleSubmit, updateMutation]
  );

  const value = useMemo<CustomerFormContextValue>(
    () => ({
      control,
      customer,
      dismiss: onDismiss,
      getValues,
      isPending: updateMutation.isPending,
      onFormSubmit,
      registerCommitPendingTag,
      setValue
    }),
    [control, customer, getValues, onDismiss, onFormSubmit, registerCommitPendingTag, setValue, updateMutation.isPending]
  );

  return <CustomerFormContext.Provider value={value}>{children}</CustomerFormContext.Provider>;
}

export function useCustomerForm(): CustomerFormContextValue {
  const context = useContext(CustomerFormContext);
  if (context === undefined) {
    throw new Error("useCustomerForm must be used within CustomerFormProvider");
  }

  return context;
}

interface CustomerFormProps {
  readonly children: ReactNode;
}

export function CustomerForm({ children }: Readonly<CustomerFormProps>): JSX.Element {
  const { onFormSubmit } = useCustomerForm();

  return (
    <form id={CUSTOMER_FORM_ID} className="min-h-0 flex-1 overflow-y-auto" onSubmit={onFormSubmit}>
      {children}
    </form>
  );
}

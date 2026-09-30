import {
  type BaseSyntheticEvent,
  type JSX,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type Control, type UseFormGetValues, type UseFormSetValue, useForm } from "react-hook-form"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { updateCustomerMutation } from "~/src/modules/user/use-cases/update-customer"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import {
  createDefaultCustomerFormValues,
  customerToFormValues,
} from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form.utils"

export const CustomerFormProvider = ({
  children,
  customer,
  onDismiss,
  onSuccess,
  open,
}: Readonly<CustomerFormProviderProps>): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail.form")
  const locale = useLocale()
  const queryClient = useQueryClient()
  const defaultValues = useMemo(() => (open ? customerToFormValues(customer) : createDefaultCustomerFormValues()), [customer, open])
  const { control, getValues, handleSubmit, reset, setValue } = useForm<User["adminCustomerFormValues"]>({
    defaultValues,
    resolver: zodResolver(userZodSchemas.adminCustomerFormValues),
  })

  const commitPendingTagRef = useRef<() => void>(() => {})
  const registerCommitPendingTag = useCallback((commit: () => void) => {
    commitPendingTagRef.current = commit
  }, [])
  useEffect(() => {
    if (open) {
      reset(customerToFormValues(customer))
    }
  }, [customer, open, reset])

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [...USER_QUERY_KEYS.ADMIN.CUSTOMER_BY_ID, customer.id, locale],
      }),
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.ADMIN.CUSTOMERS,
      }),
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.ADMIN.CUSTOMERS_PAGE,
      }),
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.ADMIN.CUSTOMER_STATS,
      }),
    ])
  }, [customer.id, locale, queryClient])

  const updateMutation = useMutation({
    ...updateCustomerMutation,
    onError: () => {
      toast.error(t("toast.errorTitle"), {
        description: t("toast.errorDescription"),
      })
    },
    onSuccess: async () => {
      await invalidate()
      toast.success(t("toast.successTitle"), {
        description: t("toast.successDescription"),
      })
      onSuccess()
    },
  })

  const onFormSubmit = useCallback(
    (event?: BaseSyntheticEvent) => {
      commitPendingTagRef.current()
      void handleSubmit((values) => {
        updateMutation.mutate({ id: customer.id, values })
      })(event)
    },
    [customer.id, handleSubmit, updateMutation],
  )

  const value = useMemo<CustomerFormContextValue>(
    () => ({
      control,
      customer,
      dismiss: onDismiss,
      getValues,
      isPending: updateMutation.isPending,
      onFormSubmit,
      registerCommitPendingTag,
      setValue,
    }),
    [control, customer, getValues, onDismiss, onFormSubmit, registerCommitPendingTag, setValue, updateMutation.isPending],
  )

  return <CustomerFormContext.Provider value={value}>{children}</CustomerFormContext.Provider>
}

export const useCustomerForm = (): CustomerFormContextValue => {
  const context = useContext(CustomerFormContext)
  if (context === undefined) {
    throw new Error("useCustomerForm must be used within CustomerFormProvider")
  }

  return context
}

export const CustomerForm = ({ children }: Readonly<CustomerFormProps>): JSX.Element => {
  const { onFormSubmit } = useCustomerForm()

  return (
    <form id={CUSTOMER_FORM_ID} className="min-h-0 flex-1 overflow-y-auto" onSubmit={onFormSubmit}>
      {children}
    </form>
  )
}

export const CUSTOMER_FORM_ID = "customer-form"

export interface CustomerFormContextValue {
  readonly control: Control<User["adminCustomerFormValues"]>
  readonly customer: User["adminCustomerDetail"]
  readonly dismiss: () => void
  readonly getValues: UseFormGetValues<User["adminCustomerFormValues"]>
  readonly isPending: boolean
  readonly onFormSubmit: (event?: BaseSyntheticEvent) => void
  readonly registerCommitPendingTag: (commit: () => void) => void
  readonly setValue: UseFormSetValue<User["adminCustomerFormValues"]>
}

const CustomerFormContext = createContext<CustomerFormContextValue | undefined>(undefined)

interface CustomerFormProviderProps {
  readonly children: ReactNode
  readonly customer: User["adminCustomerDetail"]
  readonly onDismiss: () => void
  readonly onSuccess: () => void
  readonly open: boolean
}

interface CustomerFormProps {
  readonly children: ReactNode
}

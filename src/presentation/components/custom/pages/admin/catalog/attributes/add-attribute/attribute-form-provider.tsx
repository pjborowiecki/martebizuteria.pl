import { type BaseSyntheticEvent, type JSX, type ReactNode, createContext, useCallback, useContext, useEffect, useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type Control, type FieldErrors, type UseFormSetError, type UseFormSetValue, useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { PRODUCT_ATTRIBUTE_QUERY_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { productAttributeZodSchemas } from "~/src/modules/product-attribute/product-attribute.zod"
import { createProductAttribute } from "~/src/modules/product-attribute/use-cases/create-product-attribute"
import { updateProductAttribute } from "~/src/modules/product-attribute/use-cases/update-product-attribute"

import { useAttributeFormLocaleControls } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-controls"
import { formatLocaleList } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-validation"
import { localesWithIncompleteAttributeFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale.utils"
import {
  attributeToFormValues,
  createDefaultAttributeFormValues,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form.utils"

export const PRODUCT_ATTRIBUTE_FORM_ID = "attribute-form"

export type AttributeFormMode = "create" | "edit"

export interface AttributeFormContextValue {
  readonly attributeId: string | undefined
  readonly clearErrors: ReturnType<typeof useForm<ProductAttribute["formValues"]>>["clearErrors"]
  readonly control: Control<ProductAttribute["formValues"]>
  readonly dismiss: () => void
  readonly getValues: ReturnType<typeof useForm<ProductAttribute["formValues"]>>["getValues"]
  readonly isPending: boolean
  readonly mode: AttributeFormMode
  readonly onFormSubmit: (event?: BaseSyntheticEvent) => void
  readonly setValue: UseFormSetValue<ProductAttribute["formValues"]>
  readonly trigger: ReturnType<typeof useForm<ProductAttribute["formValues"]>>["trigger"]
}

const AttributeFormContext = createContext<AttributeFormContextValue | undefined>(undefined)

interface UseAttributeMutationOptions {
  readonly attributeId: string | undefined
  readonly mode: AttributeFormMode
  readonly onCompleted: () => void
  readonly setError: UseFormSetError<ProductAttribute["formValues"]>
}

const useAttributeMutation = ({ attributeId, mode, onCompleted, setError }: UseAttributeMutationOptions) => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const queryClient = useQueryClient()

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL }),
      queryClient.invalidateQueries({ queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.STATS }),
    ])
  }, [queryClient])

  const handleError = useCallback(
    (error: unknown) => {
      if (errorCode(error) === ERROR_CODES.CONFLICT) {
        setError("handle", { message: t("toast.duplicateHandle"), type: "manual" })
        toast.error(t("toast.errorTitle"), {
          description: t("toast.duplicateHandle"),
        })

        return
      }

      toast.error(t("toast.errorTitle"), {
        description: t("toast.errorDescription"),
      })
    },
    [setError, t],
  )

  const createMutation = useMutation({
    mutationFn: (values: ProductAttribute["formValues"]) => createProductAttribute({ data: values }),
    onError: handleError,
    onSuccess: async () => {
      await invalidate()
      toast.success(t("toast.createSuccessTitle"), {
        description: t("toast.createSuccessDescription"),
      })
      onCompleted()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (values: ProductAttribute["formValues"]) => {
      if (attributeId === undefined) {
        throw new Error("Attribute id is required for update")
      }

      return updateProductAttribute({ data: { ...values, id: attributeId } })
    },
    onError: handleError,
    onSuccess: async () => {
      await invalidate()
      toast.success(t("toast.updateSuccessTitle"), {
        description: t("toast.updateSuccessDescription"),
      })
      onCompleted()
    },
  })

  return mode === "create" ? createMutation : updateMutation
}

interface AttributeFormProviderProps {
  readonly attribute: ProductAttribute["adminListItem"] | undefined
  readonly children: ReactNode
  readonly mode: AttributeFormMode
  readonly onDismiss: () => void
  readonly onSuccess?: () => void
  readonly open: boolean
}

export const AttributeFormProvider = ({
  attribute,
  children,
  mode,
  onDismiss,
  onSuccess,
  open,
}: Readonly<AttributeFormProviderProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const { focusIncompleteLocales } = useAttributeFormLocaleControls()
  const attributeId = attribute?.id

  const initialValues = useMemo(
    () => (mode === "edit" && attribute !== undefined ? attributeToFormValues(attribute) : createDefaultAttributeFormValues()),
    [attribute, mode],
  )

  const resolver = useMemo(() => zodResolver(productAttributeZodSchemas.createInput), [])

  const form = useForm<ProductAttribute["formValues"]>({
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver,
  })

  const { clearErrors, control, getValues, reset, setError, setValue, trigger } = form

  const resetFormState = useCallback(
    (values: ProductAttribute["formValues"]) => {
      reset(values, { keepDirty: false, keepTouched: false })
      clearErrors()
    },
    [clearErrors, reset],
  )

  useEffect(() => {
    if (!open) {
      resetFormState(initialValues)
    }
  }, [initialValues, open, resetFormState])

  const dismiss = useCallback(() => {
    resetFormState(initialValues)
    onDismiss()
  }, [initialValues, onDismiss, resetFormState])

  const handleCompleted = useCallback(() => {
    resetFormState(createDefaultAttributeFormValues())
    onSuccess?.()
  }, [onSuccess, resetFormState])

  const { mutate, isPending } = useAttributeMutation({
    attributeId,
    mode,
    onCompleted: handleCompleted,
    setError,
  })

  const onSubmit = useCallback(
    (values: ProductAttribute["formValues"]) => {
      mutate(values)
    },
    [mutate],
  )

  const onSubmitInvalid = useCallback(
    (errors: FieldErrors<ProductAttribute["formValues"]>) => {
      const values = form.getValues()
      const incompleteLocales = localesWithIncompleteAttributeFormValues(values)

      if (incompleteLocales.length > 0) {
        focusIncompleteLocales(incompleteLocales)
        const incompleteAllowedLocales = incompleteLocales.filter((locale) =>
          values.allowedValues.some((row) => row.labels[locale].trim() === ""),
        )

        const description =
          incompleteAllowedLocales.length > 0
            ? t("form.localePicker.incompleteAllowedValuesDescription", {
                locales: formatLocaleList(incompleteAllowedLocales),
              })
            : t("form.localePicker.incompleteToastDescription", {
                locales: formatLocaleList(incompleteLocales),
              })
        toast.error(t("form.localePicker.incompleteToastTitle"), { description })

        return
      }

      if (errors.allowedValues !== undefined && typeof errors.allowedValues.message === "string") {
        toast.error(t("form.validation.submitBlockedTitle"), {
          description: t("form.validation.ALLOWED_VALUES_REQUIRED"),
        })

        return
      }

      toast.error(t("form.validation.submitBlockedTitle"), {
        description: t("form.validation.submitBlockedDescription"),
      })
    },
    [focusIncompleteLocales, form, t],
  )

  const handleSubmit = useCallback(
    (event?: BaseSyntheticEvent) => {
      void form.handleSubmit(onSubmit, onSubmitInvalid)(event)
    },
    [form, onSubmit, onSubmitInvalid],
  )

  const value = useMemo<AttributeFormContextValue>(
    () => ({
      attributeId,
      clearErrors,
      control,
      dismiss,
      getValues,
      isPending,
      mode,
      onFormSubmit: handleSubmit,
      setValue,
      trigger,
    }),
    [attributeId, clearErrors, control, dismiss, getValues, handleSubmit, isPending, mode, setValue, trigger],
  )

  return (
    <AttributeFormContext.Provider value={value}>
      <div className="flex h-full min-h-0 flex-col">{children}</div>
    </AttributeFormContext.Provider>
  )
}

export const AttributeForm = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const { onFormSubmit } = useAttributeForm()

  return (
    <form id={PRODUCT_ATTRIBUTE_FORM_ID} onSubmit={onFormSubmit} noValidate className="min-h-0 flex-1 overflow-y-auto">
      {children}
    </form>
  )
}

export const useAttributeForm = (): AttributeFormContextValue => {
  const context = useContext(AttributeFormContext)
  if (context === undefined) {
    throw new Error("useAttributeForm must be used within AttributeFormProvider")
  }

  return context
}

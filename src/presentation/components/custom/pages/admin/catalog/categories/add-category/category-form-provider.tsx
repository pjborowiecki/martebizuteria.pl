import {
  type BaseSyntheticEvent,
  type JSX,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type Control, type FieldErrors, type UseFormSetError, type UseFormSetValue, useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl"

import { CATEGORY_ERROR_CODES, CATEGORY_QUERY_KEYS } from "~/src/modules/product-category/product-category.constants"
import { type Category } from "~/src/modules/product-category/product-category.types"
import { categoryFormSchema } from "~/src/modules/product-category/product-category.zod"
import { createCategoryFn } from "~/src/modules/product-category/use-cases/create-category"
import { updateCategoryFn } from "~/src/modules/product-category/use-cases/update-category"

import { localesWithIncompleteCategoryFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-locale.utils"
import {
  adminListItemToFormValues,
  createDefaultCategoryFormValues,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form.utils"
import {
  formatCatalogLocaleList,
  useCatalogFormLocaleControls,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls"
const useCategoryMutation = ({ categoryId, mode, onCompleted, setError }: UseCategoryMutationOptions) => {
  const t = useTranslations("pages.admin.catalog.categories")
  const queryClient = useQueryClient()
  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: CATEGORY_QUERY_KEYS.ALL,
      }),
      queryClient.invalidateQueries({
        queryKey: CATEGORY_QUERY_KEYS.ADMIN.ALL,
      }),
      queryClient.invalidateQueries({
        queryKey: CATEGORY_QUERY_KEYS.ADMIN.STATS,
      }),
    ])
  }, [queryClient])
  const handleError = useCallback(
    (error: unknown) => {
      const code = error instanceof Error ? error.message : ""
      if (code.includes(CATEGORY_ERROR_CODES.DUPLICATE_HANDLE)) {
        setError("handle", {
          message: t("toast.duplicateHandle"),
          type: "manual",
        })
        toast.error(t("toast.errorTitle"), {
          description: t("toast.duplicateHandle"),
        })
        return
      }
      if (code.includes(CATEGORY_ERROR_CODES.INVALID_PARENT)) {
        setError("parentId", {
          message: t("toast.invalidParent"),
          type: "manual",
        })
        toast.error(t("toast.errorTitle"), {
          description: t("toast.invalidParent"),
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
    mutationFn: (values: Category["formValues"]) =>
      createCategoryFn({
        data: values,
      }),
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
    mutationFn: (values: Category["formValues"]) => {
      if (categoryId === undefined) {
        throw new Error("Category id is required for update")
      }
      return updateCategoryFn({
        data: {
          ...values,
          id: categoryId,
        },
      })
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
export const CategoryFormProvider = ({
  category,
  children,
  mode,
  onDismiss,
  onSuccess,
  open,
}: Readonly<CategoryFormProviderProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.categories")
  const tLocale = useTranslations("pages.admin.catalog.localePicker")
  const { focusIncompleteLocales } = useCatalogFormLocaleControls()
  const categoryId = category?.id
  const initialValues = useMemo(
    () => (mode === "edit" && category !== undefined ? adminListItemToFormValues(category) : DEFAULT_VALUES),
    [category, mode],
  )
  const formSchema = useMemo(() => categoryFormSchema(), [])
  const resolver = useMemo(() => zodResolver(formSchema), [formSchema])
  const form = useForm<Category["formValues"]>({
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    resolver,
  })
  const { clearErrors, control, reset, setError, setValue } = form
  const [isUploading, setIsUploading] = useState(false)
  const resetFormState = useCallback(
    (values: Category["formValues"]) => {
      reset(values, {
        keepDirty: false,
        keepTouched: false,
      })
      clearErrors()
      setIsUploading(false)
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
    resetFormState(DEFAULT_VALUES)
    onSuccess?.()
  }, [onSuccess, resetFormState])
  const { mutate, isPending } = useCategoryMutation({
    categoryId,
    mode,
    onCompleted: handleCompleted,
    setError,
  })
  const onSubmit = useCallback(
    (values: Category["formValues"]) => {
      mutate(values)
    },
    [mutate],
  )
  const onSubmitInvalid = useCallback(
    (_errors: FieldErrors<Category["formValues"]>) => {
      const values = form.getValues()
      const incompleteLocales = localesWithIncompleteCategoryFormValues(values)
      if (incompleteLocales.length > 0) {
        focusIncompleteLocales(incompleteLocales)
        toast.error(tLocale("incompleteToastTitle"), {
          description: tLocale("incompleteToastDescription", {
            locales: formatCatalogLocaleList(incompleteLocales, (locale) => tLocale(`localeNames.${locale}`)),
          }),
        })
        return
      }
      toast.error(t("form.validation.submitBlockedTitle"), {
        description: t("form.validation.submitBlockedDescription"),
      })
    },
    [focusIncompleteLocales, form, t, tLocale],
  )
  const handleSubmit = useCallback(
    (event?: BaseSyntheticEvent) => {
      void form.handleSubmit(onSubmit, onSubmitInvalid)(event)
    },
    [form, onSubmit, onSubmitInvalid],
  )
  const value = useMemo<CategoryFormContextValue>(
    () => ({
      categoryId,
      control,
      dismiss,
      isPending,
      isUploading,
      mode,
      onFormSubmit: handleSubmit,
      setUploading: setIsUploading,
      setValue,
    }),
    [categoryId, control, dismiss, handleSubmit, isPending, isUploading, mode, setValue],
  )
  return (
    <CategoryFormContext.Provider value={value}>
      <div className="flex h-full min-h-0 flex-col">{children}</div>
    </CategoryFormContext.Provider>
  )
}
export const CategoryForm = ({
  children,
}: Readonly<{
  children: ReactNode
}>): JSX.Element => {
  const { onFormSubmit } = useCategoryForm()
  return (
    <form id={CATEGORY_FORM_ID} onSubmit={onFormSubmit} noValidate className="min-h-0 flex-1 overflow-y-auto">
      {children}
    </form>
  )
}
export const useCategoryForm = (): CategoryFormContextValue => {
  const context = useContext(CategoryFormContext)
  if (context === undefined) {
    throw new Error("useCategoryForm must be used within CategoryFormProvider")
  }
  return context
}
export const CATEGORY_FORM_ID = "category-form"
const DEFAULT_VALUES = createDefaultCategoryFormValues()
export type CategoryFormMode = "create" | "edit"
export interface CategoryFormContextValue {
  readonly categoryId: string | undefined
  readonly control: Control<Category["formValues"]>
  readonly dismiss: () => void
  readonly isPending: boolean
  readonly isUploading: boolean
  readonly mode: CategoryFormMode
  readonly onFormSubmit: (event?: BaseSyntheticEvent) => void
  readonly setUploading: (uploading: boolean) => void
  readonly setValue: UseFormSetValue<Category["formValues"]>
}
const CategoryFormContext = createContext<CategoryFormContextValue | undefined>(undefined)
interface UseCategoryMutationOptions {
  readonly categoryId: string | undefined
  readonly mode: CategoryFormMode
  readonly onCompleted: () => void
  readonly setError: UseFormSetError<Category["formValues"]>
}
interface CategoryFormProviderProps {
  readonly category: Category["adminListItem"] | undefined
  readonly children: ReactNode
  readonly mode: CategoryFormMode
  readonly onDismiss: () => void
  readonly onSuccess?: () => void
  readonly open: boolean
}

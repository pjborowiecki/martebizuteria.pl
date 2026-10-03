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
  useState,
} from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FormProvider, type UseFormSetError, useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { ATTRIBUTE_ON_PRODUCT_QUERY_KEYS } from "~/src/modules/attribute-on-product/attribute-on-product.constants"
import { setAllProductAttributes } from "~/src/modules/attribute-on-product/use-cases/set-all-product-attributes"
import { PRODUCT_IMAGE_QUERY_KEYS } from "~/src/modules/product-image/product-image.constants"
import {
  buildAllProductImageRows,
  buildProductLevelAttributeRows,
  buildVariantAttributeGroups,
} from "~/src/modules/product/product-admin-persist.utils"
import { collectProductFormSkuEntries } from "~/src/modules/product/product-sku.validation.utils"
import { PRODUCT_ERROR_CODES, PRODUCT_FORM_VALIDATION_KEYS, PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import {
  isDatabaseSchemaOutdatedMutationError,
  isDuplicateAttributeOnProductMutationError,
  isDuplicateHandleMutationError,
  isDuplicateSkuMutationError,
  resolveProductMutationErrorMessage,
} from "~/src/modules/product/product.mutation-errors"
import { type AdminProductDetail } from "~/src/modules/product/product.utils"
import { type ProductFormValues, parseCatalogUpsertInput, productZodSchemas } from "~/src/modules/product/product.zod"
import { createCompleteProduct } from "~/src/modules/product/use-cases/create-complete-product"
import { updateCompleteProduct } from "~/src/modules/product/use-cases/update-complete-product"
import { validateProductSkus } from "~/src/modules/product/use-cases/validate-product-skus"

import {
  formatCatalogLocaleList,
  useCatalogFormLocaleControls,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls"
import { localesWithIncompleteProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-locale.utils"
import {
  createEmptyProductFormValues,
  mapProductDetailToFormValues,
  toCatalogUpsertPayload,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

const isBenignQueryCancellationError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  return error.name === "AbortError" || error.message === "CancelledError" || error.message.includes("Cancelled")
}

const resolveProductMutationErrorDescription = (error: unknown, t: (key: string) => string): string => {
  if (isDuplicateHandleMutationError(error)) {
    return t("toast.duplicateHandle")
  }

  if (isDuplicateSkuMutationError(error)) {
    return t("toast.duplicateSku")
  }

  if (isDuplicateAttributeOnProductMutationError(error)) {
    return t("toast.duplicateAttribute")
  }

  if (isDatabaseSchemaOutdatedMutationError(error)) {
    return t("toast.databaseSchemaOutdated")
  }

  const message = resolveProductMutationErrorMessage(error)
  if (message !== "") {
    return message
  }

  return t("toast.errorDescription")
}

const applyTakenSkuFieldErrors = (
  entries: ReturnType<typeof collectProductFormSkuEntries>,
  takenSkus: readonly string[],
  setError: UseFormSetError<ProductFormValues>,
): void => {
  const takenSkuSet = new Set(takenSkus)
  for (const entry of entries) {
    if (takenSkuSet.has(entry.sku)) {
      setError(entry.formPath, {
        message: PRODUCT_FORM_VALIDATION_KEYS.duplicateSku,
        type: "manual",
      })
    }
  }
}

const useProductMutationErrorHandler = (setError: UseFormSetError<ProductFormValues>, t: (key: string) => string) =>
  useCallback(
    (error: unknown) => {
      if (isBenignQueryCancellationError(error)) {
        return
      }

      if (isDuplicateHandleMutationError(error)) {
        setError("handle", {
          message: t("toast.duplicateHandle"),
          type: "manual",
        })
      }
      toast.error(t("toast.errorTitle"), {
        description: resolveProductMutationErrorDescription(error, t),
      })
    },
    [setError, t],
  )

const useProductMutation = ({ mode, onCompleted, productId, setError }: UseProductMutationOptions) => {
  const submitInFlightRef = useRef(false)
  const t = useTranslations("pages.admin.catalog.products")
  const queryClient = useQueryClient()
  const invalidate = useCallback(
    async (handle: string, savedProductId: string) => {
      const adminProductByHandleKey = [...PRODUCT_QUERY_KEYS.ADMIN.BY_HANDLE, handle] as const
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: PRODUCT_QUERY_KEYS.ADMIN.ALL,
        }),
        queryClient.invalidateQueries({
          queryKey: adminProductByHandleKey,
        }),
        queryClient.invalidateQueries({
          queryKey: [...PRODUCT_QUERY_KEYS.ADMIN.PAGE],
        }),
        queryClient.invalidateQueries({
          queryKey: [...PRODUCT_IMAGE_QUERY_KEYS.BY_PRODUCT_ID, savedProductId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...ATTRIBUTE_ON_PRODUCT_QUERY_KEYS.BY_PRODUCT_ID, savedProductId],
        }),
      ])
    },
    [queryClient],
  )

  const persistAttributeValues = useCallback(async (savedProductId: string, values: ProductFormValues) => {
    await setAllProductAttributes({
      data: {
        productId: savedProductId,
        productValues: buildProductLevelAttributeRows(values),
        variantValues: buildVariantAttributeGroups(values),
      },
    })
  }, [])

  const saveProduct = useCallback(
    async (
      values: ProductFormValues,
    ): Promise<{
      handle: string
      id: string
    }> => {
      const skuEntries = collectProductFormSkuEntries(values)
      if (skuEntries.length > 0) {
        const { takenSkus } = await validateProductSkus({
          data: {
            productId: mode === "edit" ? productId : undefined,
            skus: skuEntries.map((entry) => entry.sku),
          },
        })

        if (takenSkus.length > 0) {
          applyTakenSkuFieldErrors(skuEntries, takenSkus, setError)

          throw new Error(PRODUCT_ERROR_CODES.DUPLICATE_SKU)
        }
      }

      const catalogPayload = parseCatalogUpsertInput(values)
      if (mode === "create") {
        const result = await createCompleteProduct({
          data: {
            ...catalogPayload,
            attributeValues: buildProductLevelAttributeRows(values),
            images: buildAllProductImageRows(values),
          },
        })
        await persistAttributeValues(result.id, values)

        return result
      }

      if (productId === undefined) {
        throw new Error("Product id is required for update")
      }

      return updateCompleteProduct({
        data: {
          ...toCatalogUpsertPayload(catalogPayload, productId),
          attributeValues: buildProductLevelAttributeRows(values),
          images: buildAllProductImageRows(values),
          variantAttributeValues: buildVariantAttributeGroups(values),
        },
      })
    },
    [mode, persistAttributeValues, productId, setError],
  )

  const handleError = useProductMutationErrorHandler(setError, t)

  const mutation = useMutation({
    mutationFn: saveProduct,
    onError: handleError,
    onSettled: () => {
      submitInFlightRef.current = false
    },
    onSuccess: async (result) => {
      try {
        await invalidate(result.handle, result.id)
      } catch (invalidateError) {
        if (!isBenignQueryCancellationError(invalidateError)) {
          handleError(invalidateError)

          return
        }
      }
      toast.success(mode === "create" ? t("toast.createSuccessTitle") : t("toast.updateSuccessTitle"), {
        description: mode === "create" ? t("toast.createSuccessDescription") : t("toast.updateSuccessDescription"),
      })
      onCompleted()
    },
    retry: false,
  })

  const submit = useCallback(
    (values: ProductFormValues) => {
      if (submitInFlightRef.current) {
        return
      }
      submitInFlightRef.current = true
      mutation.mutate(values)
    },
    [mutation],
  )

  return {
    isPending: mutation.isPending,
    submit,
  }
}

const notifyProductFormSubmitInvalid = (context: ProductFormSubmitInvalidContext): void => {
  const incompleteLocales = localesWithIncompleteProductFormValues(context.getValues())
  if (incompleteLocales.length > 0) {
    context.focusIncompleteLocales(incompleteLocales)
    toast.error(context.tLocale("incompleteToastTitle"), {
      description: context.tLocale("incompleteToastDescription", {
        locales: formatCatalogLocaleList(incompleteLocales, (locale) => context.tLocale(`localeNames.${locale}`)),
      }),
    })

    return
  }
  toast.error(context.t("form.validation.submitBlockedTitle"), {
    description: context.t("form.validation.submitBlockedDescription"),
  })
}

export const ProductFormProvider = ({
  children,
  initialProduct,
  mode,
  onDismiss,
  onSuccess,
  open,
}: Readonly<ProductFormProviderProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products")
  const tLocale = useTranslations("pages.admin.catalog.localePicker")
  const { focusIncompleteLocales } = useCatalogFormLocaleControls()
  const productId = initialProduct?.id
  const [isUploading, setIsUploading] = useState(false)
  const initialValues = useMemo(
    () => (mode === "edit" && initialProduct !== undefined ? mapProductDetailToFormValues(initialProduct) : createEmptyProductFormValues()),
    [initialProduct, mode],
  )

  const resolver = useMemo(() => zodResolver(productZodSchemas.form), [])
  const form = useForm<ProductFormValues>({
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver,
    shouldFocusError: true,
  })

  const { clearErrors, reset, setError } = form
  const resetFormState = useCallback(
    (values: ProductFormValues) => {
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
    resetFormState(initialValues)
  }, [initialValues, resetFormState])
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
    resetFormState(createEmptyProductFormValues())
    onSuccess?.()
  }, [onSuccess, resetFormState])

  const { isPending, submit } = useProductMutation({
    mode,
    onCompleted: handleCompleted,
    productId,
    setError,
  })

  const handleSubmit = useCallback(
    (event?: BaseSyntheticEvent) => {
      void form.handleSubmit(
        (values) => {
          submit(values)
        },
        () => {
          notifyProductFormSubmitInvalid({
            focusIncompleteLocales,
            getValues: form.getValues,
            t,
            tLocale,
          })
        },
      )(event)
    },
    [focusIncompleteLocales, form, submit, t, tLocale],
  )

  const value = useMemo<ProductFormContextValue>(
    () => ({
      dismiss,
      isPending,
      isUploading,
      mode,
      onFormSubmit: handleSubmit,
      productId,
      setUploading: setIsUploading,
    }),
    [dismiss, handleSubmit, isPending, isUploading, mode, productId],
  )

  return (
    <ProductFormContext.Provider value={value}>
      <FormProvider {...form}>
        <div className="flex h-full min-h-0 flex-col">{children}</div>
      </FormProvider>
    </ProductFormContext.Provider>
  )
}

export const ProductForm = ({
  children,
}: Readonly<{
  children: ReactNode
}>): JSX.Element => {
  const { onFormSubmit } = useProductForm()

  return (
    <form id={PRODUCT_FORM_ID} onSubmit={onFormSubmit} noValidate className="min-h-0 flex-1 overflow-y-auto">
      {children}
    </form>
  )
}

export const useProductForm = (): ProductFormContextValue => {
  const context = useContext(ProductFormContext)
  if (context === undefined) {
    throw new Error("useProductForm must be used within ProductFormProvider")
  }

  return context
}

export const PRODUCT_FORM_ID = "product-form"

export type ProductFormMode = "create" | "edit"

export interface ProductFormContextValue {
  readonly dismiss: () => void
  readonly isPending: boolean
  readonly isUploading: boolean
  readonly mode: ProductFormMode
  readonly onFormSubmit: (event?: BaseSyntheticEvent) => void
  readonly productId: string | undefined
  readonly setUploading: (uploading: boolean) => void
}

const ProductFormContext = createContext<ProductFormContextValue | undefined>(undefined)

interface UseProductMutationOptions {
  readonly mode: ProductFormMode
  readonly onCompleted: () => void
  readonly productId: string | undefined
  readonly setError: UseFormSetError<ProductFormValues>
}

interface ProductFormProviderProps {
  readonly children: ReactNode
  readonly initialProduct?: AdminProductDetail
  readonly mode: ProductFormMode
  readonly onDismiss: () => void
  readonly onSuccess?: () => void
  readonly open: boolean
}

interface ProductFormSubmitInvalidContext {
  readonly focusIncompleteLocales: (locales: readonly SupportedLocale[]) => void
  readonly getValues: () => ProductFormValues
  readonly t: (key: string) => string
  readonly tLocale: (
    key: string,
    values?: {
      locales: string
    },
  ) => string
}

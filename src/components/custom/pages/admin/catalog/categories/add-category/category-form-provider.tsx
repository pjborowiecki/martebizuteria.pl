import {
  type BaseSyntheticEvent,
  createContext,
  type JSX,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Control, type FieldErrors, type UseFormSetError, type UseFormSetValue, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { localesWithIncompleteCategoryFormValues } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-locale.utils";
import {
  adminListItemToFormValues,
  createDefaultCategoryFormValues
} from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form.utils";
import {
  formatCatalogLocaleList,
  useCatalogFormLocaleControls
} from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls";

import { CATEGORY_ERROR_CODES } from "~/src/modules/product-category/product-category.constants";
import { categoryMutations } from "~/src/modules/product-category/product-category.mutations";
import type { Category } from "~/src/modules/product-category/product-category.types";
import { categoryFormSchema } from "~/src/modules/product-category/product-category.zod";

export const CATEGORY_FORM_ID = "category-form";

const DEFAULT_VALUES = createDefaultCategoryFormValues();
const ZERO_LENGTH = 0;

export type CategoryFormMode = "create" | "edit";

export interface CategoryFormContextValue {
  readonly categoryId: string | undefined;
  readonly control: Control<Category["formValues"]>;
  readonly dismiss: () => void;
  readonly isPending: boolean;
  readonly isUploading: boolean;
  readonly mode: CategoryFormMode;
  readonly onFormSubmit: (e?: BaseSyntheticEvent) => void;
  readonly setUploading: (uploading: boolean) => void;
  readonly setValue: UseFormSetValue<Category["formValues"]>;
}

const CategoryFormContext = createContext<CategoryFormContextValue | undefined>(undefined);

interface UseCategoryMutationOptions {
  readonly categoryId: string | undefined;
  readonly mode: CategoryFormMode;
  readonly onCompleted: () => void;
  readonly setError: UseFormSetError<Category["formValues"]>;
}

function useCategoryMutation({ categoryId, mode, onCompleted, setError }: UseCategoryMutationOptions) {
  const t = useTranslations("pages.admin.catalog.categories");
  const queryClient = useQueryClient();

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.ALL }),
      queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.ADMIN.ALL }),
      queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.ADMIN.STATS })
    ]);
  }, [queryClient]);

  const handleError = useCallback(
    (error: unknown) => {
      const code = error instanceof Error ? error.message : "";

      if (code.includes(CATEGORY_ERROR_CODES.DUPLICATE_HANDLE)) {
        setError("handle", { message: t("toast.duplicateHandle"), type: "manual" });
        toast.error(t("toast.errorTitle"), {
          description: t("toast.duplicateHandle")
        });
        return;
      }

      if (code.includes(CATEGORY_ERROR_CODES.INVALID_PARENT)) {
        setError("parentId", { message: t("toast.invalidParent"), type: "manual" });
        toast.error(t("toast.errorTitle"), {
          description: t("toast.invalidParent")
        });
        return;
      }

      toast.error(t("toast.errorTitle"), {
        description: t("toast.errorDescription")
      });
    },
    [setError, t]
  );

  const createMutation = useMutation({
    mutationFn: (values: Category["formValues"]) => categoryMutations.createCategoryFn({ data: values }),
    onError: handleError,
    onSuccess: async () => {
      await invalidate();
      toast.success(t("toast.createSuccessTitle"), {
        description: t("toast.createSuccessDescription")
      });
      onCompleted();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (values: Category["formValues"]) => {
      if (categoryId === undefined) {
        throw new Error("Category id is required for update");
      }
      return categoryMutations.updateCategoryFn({ data: { ...values, id: categoryId } });
    },
    onError: handleError,
    onSuccess: async () => {
      await invalidate();
      toast.success(t("toast.updateSuccessTitle"), {
        description: t("toast.updateSuccessDescription")
      });
      onCompleted();
    }
  });

  return mode === "create" ? createMutation : updateMutation;
}

interface CategoryFormProviderProps {
  readonly category: Category["adminListItem"] | undefined;
  readonly children: ReactNode;
  readonly mode: CategoryFormMode;
  readonly onDismiss: () => void;
  readonly onSuccess?: () => void;
  /** When false, form state is cleared so cancel/close does not leave validation errors. */
  readonly open: boolean;
}

export function CategoryFormProvider({
  category,
  children,
  mode,
  onDismiss,
  onSuccess,
  open
}: Readonly<CategoryFormProviderProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.categories");
  const tLocale = useTranslations("pages.admin.catalog.localePicker");
  const { focusIncompleteLocales } = useCatalogFormLocaleControls();
  const categoryId = category?.id;

  const initialValues = useMemo(
    () => (mode === "edit" && category !== undefined ? adminListItemToFormValues(category) : DEFAULT_VALUES),
    [category, mode]
  );

  const formSchema = useMemo(() => categoryFormSchema(), []);
  const resolver = useMemo(() => zodResolver(formSchema), [formSchema]);

  const form = useForm<Category["formValues"]>({
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    resolver
  });

  const { clearErrors, control, reset, setError, setValue } = form;
  const [isUploading, setIsUploading] = useState(false);

  const resetFormState = useCallback(
    (values: Category["formValues"]) => {
      reset(values, { keepDirty: false, keepTouched: false });
      clearErrors();
      setIsUploading(false);
    },
    [clearErrors, reset]
  );

  useEffect(
    function resetCategoryFormOnClose() {
      if (!open) {
        resetFormState(initialValues);
      }
    },
    [initialValues, open, resetFormState]
  );

  const dismiss = useCallback(() => {
    resetFormState(initialValues);
    onDismiss();
  }, [initialValues, onDismiss, resetFormState]);

  const handleCompleted = useCallback(() => {
    resetFormState(DEFAULT_VALUES);
    onSuccess?.();
  }, [onSuccess, resetFormState]);

  const { mutate, isPending } = useCategoryMutation({
    categoryId,
    mode,
    onCompleted: handleCompleted,
    setError
  });

  const onSubmit = useCallback(
    (values: Category["formValues"]) => {
      mutate(values);
    },
    [mutate]
  );

  const onSubmitInvalid = useCallback(
    (_errors: FieldErrors<Category["formValues"]>) => {
      const values = form.getValues();
      const incompleteLocales = localesWithIncompleteCategoryFormValues(values);

      if (incompleteLocales.length > ZERO_LENGTH) {
        focusIncompleteLocales(incompleteLocales);
        toast.error(tLocale("incompleteToastTitle"), {
          description: tLocale("incompleteToastDescription", {
            locales: formatCatalogLocaleList(incompleteLocales, (locale) => tLocale(`localeNames.${locale}`))
          })
        });
        return;
      }

      toast.error(t("form.validation.submitBlockedTitle"), {
        description: t("form.validation.submitBlockedDescription")
      });
    },
    [focusIncompleteLocales, form, t, tLocale]
  );

  const handleSubmit = useCallback(
    (e?: BaseSyntheticEvent) => {
      void form.handleSubmit(onSubmit, onSubmitInvalid)(e);
    },
    [form, onSubmit, onSubmitInvalid]
  );

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
      setValue
    }),
    [categoryId, control, dismiss, handleSubmit, isPending, isUploading, mode, setValue]
  );

  return (
    <CategoryFormContext.Provider value={value}>
      <div className="flex h-full min-h-0 flex-col">{children}</div>
    </CategoryFormContext.Provider>
  );
}

/** Scrollable fields only — footer actions stay outside so cancel does not submit the form. */
export function CategoryForm({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  const { onFormSubmit } = useCategoryForm();

  return (
    <form id={CATEGORY_FORM_ID} onSubmit={onFormSubmit} noValidate className="min-h-0 flex-1 overflow-y-auto">
      {children}
    </form>
  );
}

export function useCategoryForm(): CategoryFormContextValue {
  const context = useContext(CategoryFormContext);
  if (context === undefined) {
    throw new Error("useCategoryForm must be used within CategoryFormProvider");
  }
  return context;
}

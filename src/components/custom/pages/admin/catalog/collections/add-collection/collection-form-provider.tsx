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

import { localesWithIncompleteCollectionFormValues } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-locale.utils";
import {
  adminListItemToFormValues,
  createDefaultCollectionFormValues
} from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form.utils";
import {
  formatCatalogLocaleList,
  useCatalogFormLocaleControls
} from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls";

import { COLLECTION_ERROR_CODES } from "~/src/modules/product-collection/product-collection.constants";
import { collectionMutations } from "~/src/modules/product-collection/product-collection.mutations";
import type { Collection } from "~/src/modules/product-collection/product-collection.types";
import { collectionFormSchema } from "~/src/modules/product-collection/product-collection.zod";

export const COLLECTION_FORM_ID = "collection-form";

const DEFAULT_VALUES = createDefaultCollectionFormValues();
const ZERO_LENGTH = 0;

export type CollectionFormMode = "create" | "edit";

export interface CollectionFormContextValue {
  readonly collectionId: string | undefined;
  readonly control: Control<Collection["formValues"]>;
  readonly dismiss: () => void;
  readonly isPending: boolean;
  readonly isUploading: boolean;
  readonly mode: CollectionFormMode;
  readonly onFormSubmit: (e?: BaseSyntheticEvent) => void;
  readonly setUploading: (uploading: boolean) => void;
  readonly setValue: UseFormSetValue<Collection["formValues"]>;
}

const CollectionFormContext = createContext<CollectionFormContextValue | undefined>(undefined);

interface UseCollectionMutationOptions {
  readonly collectionId: string | undefined;
  readonly mode: CollectionFormMode;
  readonly onCompleted: () => void;
  readonly setError: UseFormSetError<Collection["formValues"]>;
}

function useCollectionMutation({ collectionId, mode, onCompleted, setError }: UseCollectionMutationOptions) {
  const t = useTranslations("pages.admin.catalog.collections");
  const queryClient = useQueryClient();

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.COLLECTION.ALL }),
      queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.COLLECTION.ADMIN.ALL }),
      queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.COLLECTION.ADMIN.STATS })
    ]);
  }, [queryClient]);

  const handleError = useCallback(
    (error: unknown) => {
      const code = error instanceof Error ? error.message : "";

      if (code.includes(COLLECTION_ERROR_CODES.DUPLICATE_HANDLE)) {
        setError("handle", { message: t("toast.duplicateHandle"), type: "manual" });
        toast.error(t("toast.errorTitle"), {
          description: t("toast.duplicateHandle")
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
    mutationFn: (values: Collection["formValues"]) => collectionMutations.createCollectionFn({ data: values }),
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
    mutationFn: (values: Collection["formValues"]) => {
      if (collectionId === undefined) {
        throw new Error("Collection id is required for update");
      }
      return collectionMutations.updateCollectionFn({ data: { ...values, id: collectionId } });
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

interface CollectionFormProviderProps {
  readonly children: ReactNode;
  readonly collection: Collection["adminListItem"] | undefined;
  readonly mode: CollectionFormMode;
  readonly onDismiss: () => void;
  readonly onSuccess?: () => void;
  /** When false, form state is cleared so cancel/close does not leave validation errors. */
  readonly open: boolean;
}

export function CollectionFormProvider({
  children,
  collection,
  mode,
  onDismiss,
  onSuccess,
  open
}: Readonly<CollectionFormProviderProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.collections");
  const tLocale = useTranslations("pages.admin.catalog.localePicker");
  const { focusIncompleteLocales } = useCatalogFormLocaleControls();
  const collectionId = collection?.id;

  const initialValues = useMemo(
    () => (mode === "edit" && collection !== undefined ? adminListItemToFormValues(collection) : DEFAULT_VALUES),
    [collection, mode]
  );

  const formSchema = useMemo(() => collectionFormSchema(), []);
  const resolver = useMemo(() => zodResolver(formSchema), [formSchema]);

  const form = useForm<Collection["formValues"]>({
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    resolver
  });

  const { clearErrors, control, reset, setError, setValue } = form;
  const [isUploading, setIsUploading] = useState(false);

  const resetFormState = useCallback(
    (values: Collection["formValues"]) => {
      reset(values, { keepDirty: false, keepTouched: false });
      clearErrors();
      setIsUploading(false);
    },
    [clearErrors, reset]
  );

  useEffect(
    function resetCollectionFormOnClose() {
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

  const { mutate, isPending } = useCollectionMutation({
    collectionId,
    mode,
    onCompleted: handleCompleted,
    setError
  });

  const onSubmit = useCallback(
    (values: Collection["formValues"]) => {
      mutate(values);
    },
    [mutate]
  );

  const onSubmitInvalid = useCallback(
    (_errors: FieldErrors<Collection["formValues"]>) => {
      const values = form.getValues();
      const incompleteLocales = localesWithIncompleteCollectionFormValues(values);

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

  const value = useMemo<CollectionFormContextValue>(
    () => ({
      collectionId,
      control,
      dismiss,
      isPending,
      isUploading,
      mode,
      onFormSubmit: handleSubmit,
      setUploading: setIsUploading,
      setValue
    }),
    [collectionId, control, dismiss, handleSubmit, isPending, isUploading, mode, setValue]
  );

  return (
    <CollectionFormContext.Provider value={value}>
      <div className="flex h-full min-h-0 flex-col">{children}</div>
    </CollectionFormContext.Provider>
  );
}

/** Scrollable fields only — footer actions stay outside so cancel does not submit the form. */
export function CollectionForm({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  const { onFormSubmit } = useCollectionForm();

  return (
    <form id={COLLECTION_FORM_ID} onSubmit={onFormSubmit} noValidate className="min-h-0 flex-1 overflow-y-auto">
      {children}
    </form>
  );
}

export function useCollectionForm(): CollectionFormContextValue {
  const context = useContext(CollectionFormContext);
  if (context === undefined) {
    throw new Error("useCollectionForm must be used within CollectionFormProvider");
  }
  return context;
}

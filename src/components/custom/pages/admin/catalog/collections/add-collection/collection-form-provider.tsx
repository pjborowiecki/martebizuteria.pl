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
import { type Control, type UseFormSetError, type UseFormSetValue, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { adminListItemToFormValues } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form.utils";

import { COLLECTION_ERROR_CODES } from "~/src/modules/collection/collection.constants";
import { collectionMutations } from "~/src/modules/collection/collection.mutations";
import type { Collection } from "~/src/modules/collection/collection.types";
import { collectionFormSchema } from "~/src/modules/collection/collection.zod";

export const COLLECTION_FORM_ID = "collection-form";

const DEFAULT_VALUES: Collection["formValues"] = {
  description: "",
  handle: "",
  image: "",
  status: "draft",
  title: ""
};

export type CollectionFormMode = "create" | "edit";

export interface CollectionFormContextValue {
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
  const t = useTranslations("admin");
  const queryClient = useQueryClient();

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["collections"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "collections"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "collections", "stats"] })
    ]);
  }, [queryClient]);

  const handleError = useCallback(
    (error: unknown) => {
      const code = error instanceof Error ? error.message : "";

      if (code.includes(COLLECTION_ERROR_CODES.DUPLICATE_HANDLE)) {
        setError("handle", { message: t("collections.toast.duplicateHandle"), type: "manual" });
        toast.error(t("collections.toast.errorTitle"), {
          description: t("collections.toast.duplicateHandle")
        });
        return;
      }

      toast.error(t("collections.toast.errorTitle"), {
        description: t("collections.toast.errorDescription")
      });
    },
    [setError, t]
  );

  const createMutation = useMutation({
    mutationFn: (values: Collection["formValues"]) => collectionMutations.createCollectionFn({ data: values }),
    onError: handleError,
    onSuccess: async () => {
      await invalidate();
      toast.success(t("collections.toast.createSuccessTitle"), {
        description: t("collections.toast.createSuccessDescription")
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
      toast.success(t("collections.toast.updateSuccessTitle"), {
        description: t("collections.toast.updateSuccessDescription")
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
    function syncCollectionFormValues() {
      resetFormState(initialValues);
    },
    [initialValues, resetFormState]
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

  const handleSubmit = useCallback(
    (e?: BaseSyntheticEvent) => {
      void form.handleSubmit(onSubmit)(e);
    },
    [form, onSubmit]
  );

  const value = useMemo<CollectionFormContextValue>(
    () => ({
      control,
      dismiss,
      isPending,
      isUploading,
      mode,
      onFormSubmit: handleSubmit,
      setUploading: setIsUploading,
      setValue
    }),
    [control, dismiss, handleSubmit, isPending, isUploading, mode, setValue]
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

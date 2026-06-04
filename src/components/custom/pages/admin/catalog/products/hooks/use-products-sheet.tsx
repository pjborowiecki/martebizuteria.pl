import { createContext, type JSX, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { hasCachedAdminProductByHandle, prefetchAdminProductByHandle, productQueryOptions } from "~/src/modules/product/product.queries";
import type { Product } from "~/src/modules/product/product.types";

export type ProductsSheetMode = "closed" | "create" | "edit";

export interface ProductsSheetState {
  readonly mode: ProductsSheetMode;
  readonly product: Product["adminListItem"] | undefined;
}

export interface ProductsSheetApi {
  readonly close: () => void;
  readonly mode: ProductsSheetMode;
  readonly open: boolean;
  readonly openCreate: () => void;
  readonly openEdit: (product: Product["adminListItem"]) => void;
  readonly prefetchEdit: (product: Product["adminListItem"]) => void;
  readonly product: Product["adminListItem"] | undefined;
  readonly setOpen: (open: boolean) => void;
}

const CLOSED_STATE: ProductsSheetState = { mode: "closed", product: undefined };

const ProductsSheetContext = createContext<ProductsSheetApi | undefined>(undefined);

/** Controls the shared create/edit product sheet for the list page. */
export function useProductsSheetState(): ProductsSheetApi {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ProductsSheetState>(CLOSED_STATE);

  const prefetchEdit = useCallback(
    (product: Product["adminListItem"]) => {
      void prefetchAdminProductByHandle(queryClient, product.handle);
    },
    [queryClient]
  );

  const openCreate = useCallback(() => {
    setState({ mode: "create", product: undefined });
  }, []);

  const openEdit = useCallback(
    (product: Product["adminListItem"]) => {
      const openSheet = () => {
        setState({ mode: "edit", product });
      };

      if (hasCachedAdminProductByHandle(queryClient, product.handle)) {
        openSheet();
        return;
      }

      void (async () => {
        await queryClient.ensureQueryData(productQueryOptions.adminProductByHandleQueryOptions(product.handle));
        openSheet();
      })();
    },
    [queryClient]
  );

  const close = useCallback(() => {
    setState(CLOSED_STATE);
  }, []);

  const setOpen = useCallback((open: boolean) => {
    if (!open) {
      setState(CLOSED_STATE);
    }
  }, []);

  return useMemo(
    () => ({
      close,
      mode: state.mode,
      open: state.mode !== "closed",
      openCreate,
      openEdit,
      prefetchEdit,
      product: state.product,
      setOpen
    }),
    [close, openCreate, openEdit, prefetchEdit, setOpen, state.mode, state.product]
  );
}

export function ProductsSheetProvider({ children, value }: Readonly<{ children: ReactNode; value: ProductsSheetApi }>): JSX.Element {
  const { Provider } = ProductsSheetContext;
  return <Provider value={value}>{children}</Provider>;
}

export function useProductsSheet(): ProductsSheetApi {
  const context = useContext(ProductsSheetContext);
  if (context === undefined) {
    throw new Error("useProductsSheet must be used within ProductsSheetProvider");
  }
  return context;
}

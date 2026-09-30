import { type JSX, type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react"

import { useQueryClient } from "@tanstack/react-query"

import { type Product } from "~/src/modules/product/product.types"
import { getAdminProductQuery } from "~/src/modules/product/use-cases/get-admin-product"

export const useProductsSheetState = (): ProductsSheetApi => {
  const queryClient = useQueryClient()
  const [state, setState] = useState<ProductsSheetState>(CLOSED_STATE)
  const prefetchEdit = useCallback(
    async (product: Product["adminListItem"]) => {
      try {
        await queryClient.query(getAdminProductQuery(product.handle))
      } catch {}
    },
    [queryClient],
  )

  const openCreate = useCallback(() => {
    setState({
      mode: "create",
      product: undefined,
    })
  }, [])

  const openEdit = useCallback(
    (product: Product["adminListItem"]) => {
      const openSheet = () => {
        setState({
          mode: "edit",
          product,
        })
      }

      if (queryClient.getQueryData(getAdminProductQuery(product.handle).queryKey) !== undefined) {
        openSheet()

        return
      }
      void (async () => {
        await queryClient.query({
          ...getAdminProductQuery(product.handle),
          staleTime: "static",
        })
        openSheet()
      })()
    },
    [queryClient],
  )

  const close = useCallback(() => {
    setState(CLOSED_STATE)
  }, [])

  const setOpen = useCallback((open: boolean) => {
    if (!open) {
      setState(CLOSED_STATE)
    }
  }, [])

  return useMemo(
    () => ({
      close,
      mode: state.mode,
      open: state.mode !== "closed",
      openCreate,
      openEdit,
      prefetchEdit,
      product: state.product,
      setOpen,
    }),
    [close, openCreate, openEdit, prefetchEdit, setOpen, state.mode, state.product],
  )
}

export const ProductsSheetProvider = ({
  children,
  value,
}: Readonly<{
  children: ReactNode
  value: ProductsSheetApi
}>): JSX.Element => {
  const { Provider } = ProductsSheetContext

  return <Provider value={value}>{children}</Provider>
}

export const useProductsSheet = (): ProductsSheetApi => {
  const context = useContext(ProductsSheetContext)
  if (context === undefined) {
    throw new Error("useProductsSheet must be used within ProductsSheetProvider")
  }

  return context
}

export type ProductsSheetMode = "closed" | "create" | "edit"

export interface ProductsSheetState {
  readonly mode: ProductsSheetMode
  readonly product: Product["adminListItem"] | undefined
}

export interface ProductsSheetApi {
  readonly close: () => void
  readonly mode: ProductsSheetMode
  readonly open: boolean
  readonly openCreate: () => void
  readonly openEdit: (product: Product["adminListItem"]) => void
  readonly prefetchEdit: (product: Product["adminListItem"]) => void
  readonly product: Product["adminListItem"] | undefined
  readonly setOpen: (open: boolean) => void
}

const CLOSED_STATE: ProductsSheetState = {
  mode: "closed",
  product: undefined,
}

const ProductsSheetContext = createContext<ProductsSheetApi | undefined>(undefined)

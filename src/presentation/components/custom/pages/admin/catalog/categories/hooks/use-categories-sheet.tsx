import { type JSX, type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

export const useCategoriesSheetState = (): CategoriesSheetApi => {
  const [state, setState] = useState<CategoriesSheetState>(CLOSED_STATE)
  const openCreate = useCallback(() => {
    setState({
      category: undefined,
      mode: "create",
    })
  }, [])

  const openEdit = useCallback((category: ProductCategory["adminListItem"]) => {
    setState({
      category,
      mode: "edit",
    })
  }, [])

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
      category: state.category,
      close,
      mode: state.mode,
      open: state.mode !== "closed",
      openCreate,
      openEdit,
      setOpen,
    }),
    [close, openCreate, openEdit, setOpen, state.category, state.mode],
  )
}

export const CategoriesSheetProvider = ({
  children,
  value,
}: Readonly<{
  children: ReactNode
  value: CategoriesSheetApi
}>): JSX.Element => {
  const { Provider } = CategoriesSheetContext

  return <Provider value={value}>{children}</Provider>
}

export const useCategoriesSheet = (): CategoriesSheetApi => {
  const context = useContext(CategoriesSheetContext)
  if (context === undefined) {
    throw new Error("useCategoriesSheet must be used within CategoriesSheetProvider")
  }

  return context
}

export type CategoriesSheetMode = "closed" | "create" | "edit"

export interface CategoriesSheetState {
  readonly category: ProductCategory["adminListItem"] | undefined
  readonly mode: CategoriesSheetMode
}

export interface CategoriesSheetApi {
  readonly category: ProductCategory["adminListItem"] | undefined
  readonly close: () => void
  readonly mode: CategoriesSheetMode
  readonly open: boolean
  readonly openCreate: () => void
  readonly openEdit: (category: ProductCategory["adminListItem"]) => void
  readonly setOpen: (open: boolean) => void
}

const CLOSED_STATE: CategoriesSheetState = {
  category: undefined,
  mode: "closed",
}

const CategoriesSheetContext = createContext<CategoriesSheetApi | undefined>(undefined)

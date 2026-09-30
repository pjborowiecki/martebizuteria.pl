import { type JSX, type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

export const useAttributesSheetState = (): AttributesSheetApi => {
  const [state, setState] = useState<AttributesSheetState>(CLOSED_STATE)
  const openCreate = useCallback(() => {
    setState({
      attribute: undefined,
      mode: "create",
    })
  }, [])

  const openEdit = useCallback((attribute: ProductAttribute["adminListItem"]) => {
    setState({
      attribute,
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
      attribute: state.attribute,
      close,
      mode: state.mode,
      open: state.mode !== "closed",
      openCreate,
      openEdit,
      setOpen,
    }),
    [close, openCreate, openEdit, setOpen, state.attribute, state.mode],
  )
}

export const AttributesSheetProvider = ({
  children,
  value,
}: Readonly<{
  children: ReactNode
  value: AttributesSheetApi
}>): JSX.Element => {
  const { Provider } = AttributesSheetContext

  return <Provider value={value}>{children}</Provider>
}

export const useAttributesSheet = (): AttributesSheetApi => {
  const context = useContext(AttributesSheetContext)
  if (context === undefined) {
    throw new Error("useAttributesSheet must be used within AttributesSheetProvider")
  }

  return context
}

export type AttributesSheetMode = "closed" | "create" | "edit"

export interface AttributesSheetState {
  readonly attribute: ProductAttribute["adminListItem"] | undefined
  readonly mode: AttributesSheetMode
}

export interface AttributesSheetApi {
  readonly attribute: ProductAttribute["adminListItem"] | undefined
  readonly close: () => void
  readonly mode: AttributesSheetMode
  readonly open: boolean
  readonly openCreate: () => void
  readonly openEdit: (attribute: ProductAttribute["adminListItem"]) => void
  readonly setOpen: (open: boolean) => void
}

const CLOSED_STATE: AttributesSheetState = {
  attribute: undefined,
  mode: "closed",
}

const AttributesSheetContext = createContext<AttributesSheetApi | undefined>(undefined)

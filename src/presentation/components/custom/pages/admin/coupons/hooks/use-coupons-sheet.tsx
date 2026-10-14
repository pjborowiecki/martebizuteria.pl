import { type JSX, type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react"

import { type Discount } from "~/src/modules/discount/discount.types"

export const useCouponsSheetState = (): CouponsSheetApi => {
  const [state, setState] = useState<CouponsSheetState>(CLOSED_STATE)
  const openCreate = useCallback(() => {
    setState({
      coupon: undefined,
      mode: "create",
    })
  }, [])

  const openEdit = useCallback((coupon: Discount["adminListItem"]) => {
    setState({
      coupon,
      mode: "edit",
    })
  }, [])

  const setOpen = useCallback((open: boolean) => {
    if (!open) {
      setState(CLOSED_STATE)
    }
  }, [])

  return useMemo(
    () => ({
      coupon: state.coupon,
      mode: state.mode,
      open: state.mode !== "closed",
      openCreate,
      openEdit,
      setOpen,
    }),
    [openCreate, openEdit, setOpen, state.coupon, state.mode],
  )
}

export const CouponsSheetProvider = ({ children, value }: Readonly<{ children: ReactNode; value: CouponsSheetApi }>): JSX.Element => {
  const { Provider } = CouponsSheetContext

  return <Provider value={value}>{children}</Provider>
}

export const useCouponsSheet = (): CouponsSheetApi => {
  const context = useContext(CouponsSheetContext)
  if (context === undefined) {
    throw new Error("useCouponsSheet must be used within CouponsSheetProvider")
  }

  return context
}

export type CouponsSheetMode = "closed" | "create" | "edit"

interface CouponsSheetState {
  readonly coupon: Discount["adminListItem"] | undefined
  readonly mode: CouponsSheetMode
}

export interface CouponsSheetApi {
  readonly coupon: Discount["adminListItem"] | undefined
  readonly mode: CouponsSheetMode
  readonly open: boolean
  readonly openCreate: () => void
  readonly openEdit: (coupon: Discount["adminListItem"]) => void
  readonly setOpen: (open: boolean) => void
}

const CLOSED_STATE: CouponsSheetState = {
  coupon: undefined,
  mode: "closed",
}

const CouponsSheetContext = createContext<CouponsSheetApi | undefined>(undefined)

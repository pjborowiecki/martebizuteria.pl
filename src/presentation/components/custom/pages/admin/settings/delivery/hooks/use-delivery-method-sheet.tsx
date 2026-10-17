import { type JSX, type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react"

import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"

export const useDeliveryMethodSheetState = (): DeliveryMethodSheetApi => {
  const [state, setState] = useState<DeliveryMethodSheetState>({ open: false })

  const openCreate = useCallback(() => {
    setState({ method: undefined, open: true })
  }, [])

  const openEdit = useCallback((method: DeliveryMethod["adminMethod"]) => {
    if (method.archivedAt === undefined) {
      setState({ method, open: true })
    }
  }, [])

  const close = useCallback(() => {
    setState({ open: false })
  }, [])

  return useMemo(() => ({ close, openCreate, openEdit, state }), [close, openCreate, openEdit, state])
}

export const DeliveryMethodSheetProvider = ({
  children,
  value,
}: Readonly<{ children: ReactNode; value: DeliveryMethodSheetApi }>): JSX.Element => {
  const { Provider } = DeliveryMethodSheetContext

  return <Provider value={value}>{children}</Provider>
}

export const useDeliveryMethodSheet = (): DeliveryMethodSheetApi => {
  const context = useContext(DeliveryMethodSheetContext)
  if (context === undefined) {
    throw new Error("useDeliveryMethodSheet must be used within DeliveryMethodSheetProvider")
  }

  return context
}

type DeliveryMethodSheetState =
  | { readonly open: false }
  | { readonly method: DeliveryMethod["adminMethod"] | undefined; readonly open: true }

export interface DeliveryMethodSheetApi {
  readonly close: () => void
  readonly openCreate: () => void
  readonly openEdit: (method: DeliveryMethod["adminMethod"]) => void
  readonly state: DeliveryMethodSheetState
}

const DeliveryMethodSheetContext = createContext<DeliveryMethodSheetApi | undefined>(undefined)

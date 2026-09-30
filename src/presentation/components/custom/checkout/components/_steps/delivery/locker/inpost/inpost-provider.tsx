import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react"

import { useQuery } from "@tanstack/react-query"

import { inpostPointsByCityQueryOptions } from "~/src/integrations/inpost/inpost.queries"
import { type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod"

export const InpostProvider = ({ children, initialCity = "" }: InpostProviderProps): JSX.Element => {
  const [cityInput, setCityInput] = useState(initialCity)
  const [searchQuery, setSearchQuery] = useState(initialCity.trim())
  const [hoveredPointId, setHoveredPointId] = useState<string | undefined>()

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(cityInput.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(handle)
    }
  }, [cityInput])

  const { data: points, isLoading } = useQuery(inpostPointsByCityQueryOptions(searchQuery))
  const value = useMemo(
    () => ({
      cityInput,
      hoveredPointId,
      isLoading,
      points,
      setCityInput,
      setHoveredPointId,
    }),
    [cityInput, hoveredPointId, isLoading, points],
  )

  return <InpostContext.Provider value={value}>{children}</InpostContext.Provider>
}

export const useInpost = (): InpostContextValue => {
  const context = useContext(InpostContext)
  if (context === undefined) {
    throw new Error("useInpost must be used within a InpostProvider")
  }

  return context
}

const SEARCH_DEBOUNCE_MS = 400

export interface InpostContextValue {
  cityInput: string
  hoveredPointId: string | undefined
  isLoading: boolean
  points: readonly InpostPointParsed[] | undefined
  setCityInput: (value: string) => void
  setHoveredPointId: (value: string | undefined) => void
}

const InpostContext = createContext<InpostContextValue | undefined>(undefined)

interface InpostProviderProps {
  readonly children: ReactNode
  readonly initialCity?: string
}

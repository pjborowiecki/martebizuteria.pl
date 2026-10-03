export const buildListPaginationResult = <TItem>(
  items: readonly TItem[],
  total: number,
  params: ListPaginationParams,
): ListPaginationResult<TItem> => ({
  hasMore: params.offset + items.length < total,
  items,
  limit: params.limit,
  offset: params.offset,
  total,
})

export const listPaginationParamsFromPage = (page: number, limit: number): ListPaginationParams => {
  const safePage = Math.max(LIST_PAGE_FIRST, page)

  return {
    limit,
    offset: (safePage - LIST_PAGE_FIRST) * limit,
  }
}

export const sortRowsByIdOrder = <
  TRow extends {
    id: string
  },
>(
  rows: readonly TRow[],
  orderedIds: readonly string[],
): TRow[] => {
  const orderById = new Map(orderedIds.map((id, index) => [id, index]))

  return [...rows].toSorted((left, right) => (orderById.get(left.id) ?? 0) - (orderById.get(right.id) ?? 0))
}

export const LIST_PAGE_FIRST = 1

export const LIST_PAGE_STEP = 1

export const LIST_PAGE_SIZE_MAX = 250

export interface ListPaginationParams {
  readonly limit: number
  readonly offset: number
}

export interface ListPaginationResult<TItem> {
  readonly hasMore: boolean
  readonly items: readonly TItem[]
  readonly limit: number
  readonly offset: number
  readonly total: number
}

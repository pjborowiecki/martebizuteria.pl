import { z } from "zod/v4"
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
export const LIST_PAGE_FIRST = 1
export const LIST_PAGE_STEP = 1
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
export const listPageSearchSchema = z.object({
  page: z.coerce.number().int().min(LIST_PAGE_FIRST).default(LIST_PAGE_FIRST),
})
export type ListPageSearch = z.infer<typeof listPageSearchSchema>

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { ROUTES } from "~/src/routes"

export const CONTENT_PAGE_HANDLE = {
  EXCHANGES_AND_RETURNS: "exchanges-and-returns",
  PRIVACY_POLICY: "privacy-policy",
} as const

export const CONTENT_PAGE_HANDLES = [CONTENT_PAGE_HANDLE.PRIVACY_POLICY, CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS] as const

export type ContentPageHandle = (typeof CONTENT_PAGE_HANDLES)[number]

export const CONTENT_PAGE_PATHS = {
  [CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS]: ROUTES.EXCHANGES_AND_RETURNS,
  [CONTENT_PAGE_HANDLE.PRIVACY_POLICY]: ROUTES.PRIVACY_POLICY,
} as const satisfies Record<ContentPageHandle, string>

export const CONTENT_PAGE_COLUMN_LENGTH = {
  body: 100_000,
  description: 300,
  handle: 64,
  id: UUID_STRING_LENGTH,
  title: 120,
} as const

export const CONTENT_PAGE_LINK_PATTERN = /^(?:https?:\/\/|mailto:|tel:|\/(?![/\\]))[^\s()<>\\]*$/u

export const CONTENT_PAGE_QUERY_STALE_MS = 60_000

export const CONTENT_PAGE_MUTATION_KEYS = {
  UPDATE: ["content-page", "update"] as const,
} as const

export const CONTENT_PAGE_QUERY_KEYS = {
  ADMIN: {
    ALL: ["admin", "content-pages"] as const,
    BY_HANDLE: ["admin", "content-page"] as const,
  },
  BY_HANDLE: ["content-page"] as const,
} as const

export const CONTENT_PAGE_VALIDATION_KEYS = {
  bodyRequired: "editor.validation.bodyRequired",
  bodyTooLong: "editor.validation.bodyTooLong",
  bodyUnsupported: "editor.validation.bodyUnsupported",
  descriptionRequired: "editor.validation.descriptionRequired",
  descriptionTooLong: "editor.validation.descriptionTooLong",
  titleRequired: "editor.validation.titleRequired",
  titleTooLong: "editor.validation.titleTooLong",
} as const

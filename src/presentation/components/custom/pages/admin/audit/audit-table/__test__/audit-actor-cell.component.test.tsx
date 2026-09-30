import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AuditActorCell } from "~/src/presentation/components/custom/pages/admin/audit/audit-table/audit-actor-cell"

afterEach(() => {
  cleanup()
})

describe("AuditActorCell", () => {
  it("shows the actor's name", () => {
    renderWithProviders(<AuditActorCell initials="AK" name="Anna Kowalska" roleColor="bg-primary/10" />)

    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
  })

  it("falls back to the initials, because no avatar image is ever loaded", () => {
    renderWithProviders(<AuditActorCell initials="AK" name="Anna Kowalska" roleColor="bg-primary/10" />)

    expect(screen.getByText("AK")).toBeInTheDocument()
  })

  it("tints the initials with the role colour the caller passes", () => {
    renderWithProviders(<AuditActorCell initials="AK" name="Anna Kowalska" roleColor="bg-destructive/10" />)

    expect(screen.getByText("AK")).toHaveClass("bg-destructive/10")
  })

  it("truncates a long actor name instead of widening the row", () => {
    renderWithProviders(<AuditActorCell initials="MB" name="Maria Bardzo Dluga Nazwa Uzytkownika" roleColor="bg-primary/10" />)

    expect(screen.getByText("Maria Bardzo Dluga Nazwa Uzytkownika")).toHaveClass("truncate")
  })

  it("renders an empty avatar fallback when the actor has no initials", () => {
    renderWithProviders(<AuditActorCell initials="" name="Unknown" roleColor="bg-primary/10" />)

    expect(screen.getByText("Unknown")).toBeInTheDocument()
  })
})

import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CustomerEmailHistory } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-email-history"

afterEach(() => {
  cleanup()
})

describe("CustomerEmailHistory", () => {
  it("lists the current address and every earlier one with the dates the account used it", () => {
    renderWithProviders(
      <CustomerEmailHistory
        emailHistory={[
          { addedOn: "15 Jan 2026", email: "anna@new.example" },
          { addedOn: "2 May 2025", email: "anna@old.example", replacedOn: "15 Jan 2026" },
        ]}
      />,
    )
    const [current, former] = screen.getAllByRole("listitem")

    expect(screen.getByText("Email addresses")).toBeInTheDocument()
    expect(within(current ?? document.body).getByText("anna@new.example")).toHaveAttribute("title", "anna@new.example")
    expect(within(current ?? document.body).getByText("Current, since 15 Jan 2026")).toBeInTheDocument()
    expect(within(former ?? document.body).getByText("Used 2 May 2025 – 15 Jan 2026")).toBeInTheDocument()
  })
})

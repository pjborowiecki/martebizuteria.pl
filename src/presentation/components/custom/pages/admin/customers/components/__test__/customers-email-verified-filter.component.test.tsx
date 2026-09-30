import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithCustomersGrid } from "~/src/presentation/components/custom/pages/admin/customers/components/__test__/customers-grid-harness"
import { CustomersEmailVerifiedFilter } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-email-verified-filter"

const TRIGGER_LABEL = "Filter by email verification"

const trigger = () => screen.getByRole("combobox", { name: TRIGGER_LABEL })

const pick = async (option: string) => {
  await userEvent.click(trigger())
  const options = await screen.findAllByRole("option")
  const target = options.find((item) => item.textContent === option)
  if (target === undefined) {
    throw new Error(`No option labelled ${option}`)
  }
  await userEvent.click(target)
}

afterEach(() => {
  cleanup()
})

describe("CustomersEmailVerifiedFilter", () => {
  it("starts with no verification filter applied", () => {
    renderWithCustomersGrid(<CustomersEmailVerifiedFilter />)

    expect(trigger()).toHaveTextContent("Email verification: all")
  })

  it("offers all, verified and unverified", async () => {
    renderWithCustomersGrid(<CustomersEmailVerifiedFilter />)

    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((item) => item.textContent)).toStrictEqual(["Email verification: all", "Email verified", "Email not verified"])
  })

  it("keeps the verified filter on the column", async () => {
    renderWithCustomersGrid(<CustomersEmailVerifiedFilter />)
    await pick("Email verified")

    expect(trigger()).toHaveTextContent("Email verified")
  })

  it("distinguishes unverified from no filter at all", async () => {
    renderWithCustomersGrid(<CustomersEmailVerifiedFilter />)
    await pick("Email not verified")

    expect(trigger()).toHaveTextContent("Email not verified")
  })

  it("clears the filter again when all is chosen", async () => {
    renderWithCustomersGrid(<CustomersEmailVerifiedFilter />)
    await pick("Email not verified")
    await pick("Email verification: all")

    expect(trigger()).toHaveTextContent("Email verification: all")
  })
})

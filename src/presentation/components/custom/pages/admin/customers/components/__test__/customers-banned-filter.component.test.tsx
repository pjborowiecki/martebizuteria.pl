import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithCustomersGrid } from "~/src/presentation/components/custom/pages/admin/customers/components/__test__/customers-grid-harness"
import { CustomersBannedFilter } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-banned-filter"

const TRIGGER_LABEL = "Filter by ban status"

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

describe("CustomersBannedFilter", () => {
  it("starts with no ban filter applied", () => {
    renderWithCustomersGrid(<CustomersBannedFilter />)

    expect(trigger()).toHaveTextContent("Ban status: all")
  })

  it("offers all, banned and not banned", async () => {
    renderWithCustomersGrid(<CustomersBannedFilter />)

    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((item) => item.textContent)).toStrictEqual(["Ban status: all", "Banned accounts", "Not banned"])
  })

  it("keeps the ban filter it was given on the column", async () => {
    renderWithCustomersGrid(<CustomersBannedFilter />)
    await pick("Banned accounts")

    expect(trigger()).toHaveTextContent("Banned accounts")
  })

  it("distinguishes not banned from no filter at all", async () => {
    renderWithCustomersGrid(<CustomersBannedFilter />)
    await pick("Not banned")

    expect(trigger()).toHaveTextContent("Not banned")
  })

  it("clears the filter again when all is chosen", async () => {
    renderWithCustomersGrid(<CustomersBannedFilter />)
    await pick("Banned accounts")
    await pick("Ban status: all")

    expect(trigger()).toHaveTextContent("Ban status: all")
  })
})

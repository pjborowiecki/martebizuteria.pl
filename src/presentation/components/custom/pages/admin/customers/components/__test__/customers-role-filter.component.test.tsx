import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithCustomersGrid } from "~/src/presentation/components/custom/pages/admin/customers/components/__test__/customers-grid-harness"
import { CustomersRoleFilter } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-role-filter"
import { customersDataGrid } from "~/src/presentation/components/custom/pages/admin/customers/utils/customers-data-grid"

const TRIGGER_LABEL = "Filter by role"

const ListedCustomers = (): JSX.Element => {
  const { table } = customersDataGrid.useDataGrid()
  const names = table.getRowModel().rows.map((row) => row.original.name)

  return <p data-testid="listed-customers">{names.join(", ")}</p>
}

const listedCustomers = () => screen.getByTestId("listed-customers").textContent

const renderGridWithListing = () =>
  renderWithCustomersGrid(
    <>
      <CustomersRoleFilter />
      <ListedCustomers />
    </>,
  )

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

describe("CustomersRoleFilter", () => {
  it("starts with every role included", () => {
    renderWithCustomersGrid(<CustomersRoleFilter />)

    expect(trigger()).toHaveTextContent("All roles")
  })

  it("offers all roles plus the two the access model defines", async () => {
    renderWithCustomersGrid(<CustomersRoleFilter />)

    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((item) => item.textContent)).toStrictEqual(["All roles", "Customer", "Admin"])
  })

  it("narrows the table to administrators", async () => {
    renderWithCustomersGrid(<CustomersRoleFilter />)
    await pick("Admin")

    expect(trigger()).toHaveTextContent("Admin")
  })

  it("narrows the table to shoppers", async () => {
    renderWithCustomersGrid(<CustomersRoleFilter />)
    await pick("Customer")

    expect(trigger()).toHaveTextContent("Customer")
  })

  it("clears the role filter again", async () => {
    renderWithCustomersGrid(<CustomersRoleFilter />)
    await pick("Admin")
    await pick("All roles")

    expect(trigger()).toHaveTextContent("All roles")
  })
})

describe("the customers the role filter leaves listed", () => {
  it("lists every customer while no role is chosen", () => {
    renderGridWithListing()

    expect(listedCustomers()).toBe("Anna Kowalska, Jan Nowak")
  })

  it("drops the shoppers once administrators are chosen", async () => {
    renderGridWithListing()
    await pick("Admin")

    expect(listedCustomers()).toBe("Jan Nowak")
  })

  it("drops the administrators once shoppers are chosen", async () => {
    renderGridWithListing()
    await pick("Customer")

    expect(listedCustomers()).toBe("Anna Kowalska")
  })

  it("brings everyone back when the role filter is cleared", async () => {
    renderGridWithListing()
    await pick("Admin")
    await pick("All roles")

    expect(listedCustomers()).toBe("Anna Kowalska, Jan Nowak")
  })
})

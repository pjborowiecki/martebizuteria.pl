import { type JSX, useEffect } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, type UseFormReturn, useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { ProductEditorOrganization } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-organization"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

const RINGS = "0195f0c0-0000-7000-8000-00000000c001"

const CHAINS = "0195f0c0-0000-7000-8000-00000000c002"

const SILVER = "0195f0c0-0000-7000-8000-00000000d001"

vi.mock("~/src/modules/product-category/use-cases/get-admin-categories", () => ({
  getAdminCategoriesQuery: () => ({
    queryFn: () =>
      Promise.resolve([
        { id: RINGS, titles: { "en-US": "Rings", "pl-PL": "Pierścionki" } },
        { id: CHAINS, titles: { "en-US": "Chains", "pl-PL": "Łańcuszki" } },
      ]),
    queryKey: ["admin", "categories"],
  }),
}))

vi.mock("~/src/modules/product-collection/use-cases/get-admin-collections", () => ({
  getAdminCollectionsQuery: () => ({
    queryFn: () => Promise.resolve([{ id: SILVER, titles: { "en-US": "Silver 925", "pl-PL": "Srebro 925" } }]),
    queryKey: ["admin", "collections"],
  }),
}))

beforeEach(() => {
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn(), writable: true })
})

afterEach(cleanup)

type ProductForm = UseFormReturn<ProductFormValues>

const OrganizationHarness = ({
  onForm,
  overrides,
  primaryError,
}: Readonly<{
  onForm: (form: ProductForm) => void
  overrides?: Partial<ProductFormValues> | undefined
  primaryError?: string | undefined
}>): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: {
      ...createEmptyProductFormValues(),
      ...overrides,
    },
  })
  useEffect(() => {
    onForm(form)
    if (primaryError !== undefined) {
      form.setError("primaryCategoryId", {
        message: primaryError,
      })
    }
  }, [form, onForm, primaryError])

  return (
    <FormProvider {...form}>
      <ProductEditorOrganization />
    </FormProvider>
  )
}

const renderOrganization = (props: Omit<Parameters<typeof OrganizationHarness>[0], "onForm"> = {}): (() => ProductFormValues) => {
  const captured: ProductForm[] = []
  const onForm = (form: ProductForm): void => {
    captured.push(form)
  }
  renderWithProviders(<OrganizationHarness onForm={onForm} {...props} />)

  return () => {
    const [form] = captured
    if (form === undefined) {
      throw new TypeError("the harness never exposed its form")
    }

    return form.getValues()
  }
}

describe("ProductEditorOrganization", () => {
  it("offers a primary category, additional categories and collections", async () => {
    renderOrganization()

    expect(await screen.findByText("Organization")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Primary category" })).toBeInTheDocument()
    expect(screen.getByLabelText("Additional categories")).toBeInTheDocument()
    expect(screen.getByLabelText("Collections")).toBeInTheDocument()
  })

  it("prompts for a primary category while none is chosen", async () => {
    renderOrganization()

    expect(await screen.findByText("Select category...")).toBeInTheDocument()
  })

  it("names the chosen primary category in the current locale", async () => {
    renderOrganization({ overrides: { primaryCategoryId: CHAINS } })

    expect(await screen.findByRole("combobox", { name: "Primary category" })).toHaveTextContent("Chains")
  })

  it("lists every category as a primary choice", async () => {
    renderOrganization()

    await userEvent.click(await screen.findByRole("combobox", { name: "Primary category" }))
    const options = await screen.findAllByRole("option")

    expect(options.map((item) => item.textContent)).toStrictEqual(["Rings", "Chains"])
  })

  it("stores the picked primary category id", async () => {
    const values = renderOrganization()

    await userEvent.click(await screen.findByRole("combobox", { name: "Primary category" }))
    const options = await screen.findAllByRole("option")
    const rings = options.find((item) => item.textContent === "Rings")
    await userEvent.click(rings ?? screen.getByRole("combobox", { name: "Primary category" }))

    expect(values().primaryCategoryId).toBe(RINGS)
  })

  it("drops the newly primary category from the additional list", async () => {
    const values = renderOrganization({ overrides: { additionalCategoryIds: [RINGS, CHAINS], primaryCategoryId: "" } })

    await userEvent.click(await screen.findByRole("combobox", { name: "Primary category" }))
    const options = await screen.findAllByRole("option")
    const rings = options.find((item) => item.textContent === "Rings")
    await userEvent.click(rings ?? screen.getByRole("combobox", { name: "Primary category" }))

    expect(values().additionalCategoryIds).toStrictEqual([CHAINS])
  })

  it("does not offer the primary category as an additional one", async () => {
    renderOrganization({ overrides: { primaryCategoryId: RINGS } })

    expect(await screen.findByLabelText("Additional categories")).not.toHaveTextContent("Rings")
  })

  it("names the already selected additional categories", async () => {
    renderOrganization({ overrides: { additionalCategoryIds: [CHAINS] } })

    expect(await screen.findByLabelText("Additional categories")).toHaveTextContent("Chains")
  })

  it("stores an additional category the admin ticks", async () => {
    const values = renderOrganization()

    await userEvent.click(await screen.findByLabelText("Additional categories"))
    await userEvent.click(await screen.findByRole("option", { name: "Chains" }))

    expect(values().additionalCategoryIds).toStrictEqual([CHAINS])
  })

  it("stores a collection the admin ticks", async () => {
    const values = renderOrganization()

    await userEvent.click(await screen.findByLabelText("Collections"))
    await userEvent.click(await screen.findByRole("option", { name: "Silver 925" }))

    expect(values().collectionIds).toStrictEqual([SILVER])
  })

  it("names the already selected collections", async () => {
    renderOrganization({ overrides: { collectionIds: [SILVER] } })

    expect(await screen.findByLabelText("Collections")).toHaveTextContent("Silver 925")
  })

  it("prompts for collections while none are chosen", async () => {
    renderOrganization()

    expect(await screen.findByLabelText("Collections")).toHaveTextContent("Select collections...")
  })

  it("translates the primary category requirement", async () => {
    renderOrganization({ primaryError: "organization.validation.primaryCategoryRequired" })

    expect(await screen.findByText("Select a primary category.")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Primary category" })).toHaveAttribute("aria-invalid", "true")
  })

  it("passes an unrecognized primary category error through untranslated", async () => {
    renderOrganization({ primaryError: "unmapped" })

    expect(await screen.findByText("unmapped")).toBeInTheDocument()
  })
})

const UnregisteredPrimaryCategoryHarness = (): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: {
      additionalCategoryIds: [],
      collectionIds: [],
    },
  })

  return (
    <FormProvider {...form}>
      <ProductEditorOrganization />
    </FormProvider>
  )
}

describe("ProductEditorOrganization before the primary category is registered", () => {
  it("prompts for a category instead of rendering a blank selection", async () => {
    renderWithProviders(<UnregisteredPrimaryCategoryHarness />)

    expect(await screen.findByText("Select category...")).toBeInTheDocument()
  })

  it("keeps every category available as an additional one", async () => {
    renderWithProviders(<UnregisteredPrimaryCategoryHarness />)

    await userEvent.click(await screen.findByLabelText("Additional categories"))

    expect(await screen.findByRole("option", { name: "Rings" })).toBeInTheDocument()
    expect(await screen.findByRole("option", { name: "Chains" })).toBeInTheDocument()
  })
})

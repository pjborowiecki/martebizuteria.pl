import { type JSX, type ReactNode, useEffect } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, type UseFormReturn, useForm, useFormContext } from "react-hook-form"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { TestProviders, createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"
import { useProductEditorBasicFields } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/use-product-editor-basic-fields"

afterEach(cleanup)

type ProductForm = UseFormReturn<ProductFormValues>

const buildWrapper = (overrides?: Partial<ProductFormValues>) =>
  function FormWrapper({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
    const form = useForm<ProductFormValues>({
      defaultValues: {
        ...createEmptyProductFormValues(),
        ...overrides,
      },
    })

    return (
      <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
        <FormProvider {...form}>{children}</FormProvider>
      </TestProviders>
    )
  }

const renderFields = (overrides?: Partial<ProductFormValues>) =>
  renderHook(
    () => {
      const { control, getValues } = useFormContext<ProductFormValues>()

      return { fields: useProductEditorBasicFields(control), getValues }
    },
    { wrapper: buildWrapper(overrides) },
  )

const BasicFieldsHarness = ({
  onForm,
}: Readonly<{
  onForm: (form: ProductForm) => void
}>): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: createEmptyProductFormValues(),
  })
  const fields = useProductEditorBasicFields(form.control)
  useEffect(() => {
    onForm(form)
  }, [form, onForm])

  return (
    <FormProvider {...form}>
      <input aria-label="sku" onChange={fields.handleSkuChange} value={fields.skuValue} />
      <input aria-label="slug" onChange={fields.handleSlugChange} value={fields.slugValue} />
    </FormProvider>
  )
}

const renderHarness = (): (() => ProductFormValues) => {
  const captured: ProductForm[] = []
  const onForm = (form: ProductForm): void => {
    captured.push(form)
  }
  renderWithProviders(<BasicFieldsHarness onForm={onForm} />)

  return () => {
    const [form] = captured
    if (form === undefined) {
      throw new TypeError("the harness never exposed its form")
    }

    return form.getValues()
  }
}

describe("useProductEditorBasicFields", () => {
  it("starts both fields empty for a new product", () => {
    const { result } = renderFields()

    expect(result.current.fields.skuValue).toBe("")
    expect(result.current.fields.slugValue).toBe("")
  })

  it("exposes the stored sku and handle as strings", () => {
    const { result } = renderFields({
      handle: "gold-chain",
      simpleVariant: { compareAtPrice: "", manageInventory: true, price: "", quantity: 0, sku: "GC-1" },
    })

    expect(result.current.fields.skuValue).toBe("GC-1")
    expect(result.current.fields.slugValue).toBe("gold-chain")
  })

  it("wires each controller to the form field it edits", () => {
    const { result } = renderFields()

    expect(result.current.fields.slugField.name).toBe("handle")
    expect(result.current.fields.skuField.name).toBe("simpleVariant.sku")
  })

  it("reports both fields as valid until validation runs", () => {
    const { result } = renderFields()

    expect(result.current.fields.slugFieldState.invalid).toBe(false)
    expect(result.current.fields.skuFieldState.invalid).toBe(false)
  })

  it("coerces a sku the form holds as a non string into an empty display value", () => {
    const { result } = renderFields()

    act(() => {
      result.current.fields.skuField.onChange(undefined)
    })

    expect(result.current.fields.skuValue).toBe("")
  })
})

describe("useProductEditorBasicFields change handlers", () => {
  it("writes a typed sku into the form as it is typed", async () => {
    const values = renderHarness()

    await userEvent.type(screen.getByLabelText("sku"), "GC-2")

    expect(values().simpleVariant?.sku).toBe("GC-2")
    expect(screen.getByLabelText("sku")).toHaveValue("GC-2")
  })

  it("writes the handle exactly as typed, leaving normalization to the editor", async () => {
    const values = renderHarness()

    await userEvent.type(screen.getByLabelText("slug"), "Gold Chain")

    expect(values().handle).toBe("Gold Chain")
    expect(screen.getByLabelText("slug")).toHaveValue("Gold Chain")
  })

  it("keeps the two fields independent", async () => {
    const values = renderHarness()

    await userEvent.type(screen.getByLabelText("sku"), "GC-3")

    expect(values().handle).toBe("")
  })
})

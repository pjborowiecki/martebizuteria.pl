import { type JSX, type MouseEvent, useCallback } from "react"

import { useQuery } from "@tanstack/react-query"
import { cn } from "cn"
import { ArrowRight, MapPin } from "lucide-react"
import { useWatch } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { type Address } from "~/src/modules/address/address.types"
import { listUserAddressesQuery } from "~/src/modules/address/use-cases/list-user-addresses"

import { Button } from "~/src/presentation/components/shadcn/button"
import { FieldGroup } from "~/src/presentation/components/shadcn/field"

import { CheckoutCheckboxField, CheckoutTextField } from "~/src/presentation/components/custom/checkout/components/checkout-fields"
import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
import { CHECKOUT_STEP_ID } from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

const NO_SAVED_ADDRESSES: readonly Address["select"][] = []

type AddressPrefix = "billing" | "shipping"

type SelectAddress = (addr: Address["select"], prefix: AddressPrefix) => void

export const AddressStep = (): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")

  const { control, isPending, onNext, setValue } = useCheckoutForm()

  const sameAsShipping = useWatch({ control, name: "sameAsShipping" })

  const { data: session } = useQuery(getCurrentSessionQuery)
  const { data: addresses } = useQuery({ ...listUserAddressesQuery(), enabled: session !== null && session !== undefined })

  const handleContinue = useCallback(
    (event: MouseEvent) => {
      void onNext(CHECKOUT_STEP_ID.BILLING, event)
    },
    [onNext],
  )

  const countryName = t("countries.PL")

  const populateAddress = useCallback<SelectAddress>(
    (addr, prefix) => {
      const isBilling = prefix === "billing"
      setValue(isBilling ? "billingFirstName" : "firstName", addr.firstName ?? "")
      setValue(isBilling ? "billingLastName" : "lastName", addr.lastName ?? "")
      setValue(isBilling ? "billingAddress1" : "address1", addr.address1)
      setValue(isBilling ? "billingPostalCode" : "postalCode", addr.postalCode ?? "")
      setValue(isBilling ? "billingCity" : "city", addr.city)
      setValue(isBilling ? "billingCountryCode" : "countryCode", addr.countryCode)
    },
    [setValue],
  )

  return (
    <div className="flex flex-col gap-6">
      <SavedAddresses
        addresses={addresses ?? NO_SAVED_ADDRESSES}
        heading={t("shippingAddress")}
        onSelect={populateAddress}
        prefix="shipping"
      />

      <FieldGroup className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <CheckoutTextField control={control} name="firstName" label={t("firstName")} autoComplete="shipping given-name" required />
        <CheckoutTextField control={control} name="lastName" label={t("lastName")} autoComplete="shipping family-name" required />
        <CheckoutTextField
          control={control}
          name="address1"
          label={t("addressLine1")}
          className="sm:col-span-2"
          autoComplete="shipping address-line1"
          required
        />
        <CheckoutTextField control={control} name="postalCode" label={t("postalCode")} autoComplete="shipping postal-code" required />
        <CheckoutTextField control={control} name="city" label={t("city")} autoComplete="shipping address-level2" required />
        <CheckoutTextField
          control={control}
          name="countryCode"
          label={t("country")}
          className="sm:col-span-2"
          autoComplete="shipping country-name"
          readOnly
          displayValue={countryName}
        />
      </FieldGroup>

      <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:gap-8">
        <div className="w-fit">
          <CheckoutCheckboxField control={control} name="saveShippingAddress" label={t("saveShippingAddress")} />
        </div>
        <div className="w-fit">
          <CheckoutCheckboxField control={control} name="sameAsShipping" label={t("sameAsShipping")} />
        </div>
      </div>

      {sameAsShipping === false && (
        <div className="flex flex-col gap-6 border-t border-border/50 pt-4">
          <SavedAddresses
            addresses={addresses ?? NO_SAVED_ADDRESSES}
            heading={t("billingAddress")}
            onSelect={populateAddress}
            prefix="billing"
          />
          <FieldGroup className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <CheckoutTextField
              control={control}
              name="billingFirstName"
              label={t("firstName")}
              autoComplete="billing given-name"
              required
            />
            <CheckoutTextField control={control} name="billingLastName" label={t("lastName")} autoComplete="billing family-name" required />
            <CheckoutTextField
              control={control}
              name="billingAddress1"
              label={t("addressLine1")}
              className="sm:col-span-2"
              autoComplete="billing address-line1"
              required
            />
            <CheckoutTextField
              control={control}
              name="billingPostalCode"
              label={t("postalCode")}
              autoComplete="billing postal-code"
              required
            />
            <CheckoutTextField control={control} name="billingCity" label={t("city")} autoComplete="billing address-level2" required />
            <CheckoutTextField
              control={control}
              name="billingCountryCode"
              label={t("country")}
              className="sm:col-span-2"
              autoComplete="billing country-name"
              readOnly
              displayValue={countryName}
            />
          </FieldGroup>
          <div className="pt-1">
            <CheckoutCheckboxField control={control} name="saveBillingAddress" label={t("saveBillingAddress")} />
          </div>
        </div>
      )}

      <div>
        <Button
          size="lg"
          onClick={handleContinue}
          className="group min-h-11 w-full cursor-pointer rounded-none px-8 tracking-[0.2em] uppercase sm:w-auto"
          disabled={isPending}
        >
          {t("continueToDelivery")}
          <ArrowRight aria-hidden className="ml-2 size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.15} />
        </Button>
      </div>
    </div>
  )
}

const SavedAddresses = ({
  addresses,
  heading,
  onSelect,
  prefix,
}: Readonly<{
  addresses: readonly Address["select"][]
  heading: string
  onSelect: SelectAddress
  prefix: AddressPrefix
}>): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const hasAddresses = addresses.length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full items-center justify-between">
        <h3 className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">{heading}</h3>
        <span className={cn("text-[10px] tracking-widest text-muted-foreground", hasAddresses ? "uppercase underline" : "italic")}>
          {hasAddresses ? t("savedAddresses") : t("noSavedAddresses")}
        </span>
      </div>
      {hasAddresses && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <AddressCard key={`${prefix}-${addr.id}`} addr={addr} onSelect={onSelect} prefix={prefix} />
          ))}
        </div>
      )}
    </div>
  )
}

interface AddressCardProps {
  readonly addr: Address["select"]
  readonly onSelect: SelectAddress
  readonly prefix: AddressPrefix
}

const AddressCard = ({ addr, onSelect, prefix }: AddressCardProps): JSX.Element => {
  const handleClick = useCallback(() => {
    onSelect(addr, prefix)
  }, [addr, onSelect, prefix])

  return (
    <button
      type="button"
      className="flex cursor-pointer flex-col gap-1 rounded-none border border-border/50 bg-background p-4 text-left transition-colors hover:border-border"
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <MapPin className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {addr.firstName} {addr.lastName}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">
        {addr.address1}, {addr.postalCode} {addr.city}
      </span>
    </button>
  )
}

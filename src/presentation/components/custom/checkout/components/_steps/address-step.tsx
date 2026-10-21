import { type JSX, type MouseEvent, useCallback, useEffect, useId, useMemo, useState } from "react"

import { useQuery } from "@tanstack/react-query"
import { ArrowRight, MapPin } from "lucide-react"
import { useWatch } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { type Address } from "~/src/modules/address/address.types"
import { listUserAddressesQuery } from "~/src/modules/address/use-cases/list-user-addresses"
import { COMPANY_NAME_MAX_LENGTH } from "~/src/modules/checkout/checkout.constants"
import { DELIVERY_COUNTRY_CODES } from "~/src/modules/delivery-method/delivery-method.constants"

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
  const deliverableAddresses = useMemo(
    () => (addresses ?? NO_SAVED_ADDRESSES).filter((addr) => DELIVERY_COUNTRY_CODES.has(addr.countryCode)),
    [addresses],
  )

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
      <SavedAddresses addresses={deliverableAddresses} heading={t("shippingAddress")} onSelect={populateAddress} prefix="shipping" />

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
        <SaveAddressField addresses={deliverableAddresses} className="w-fit" prefix="shipping" />
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
          <SaveAddressField addresses={addresses ?? NO_SAVED_ADDRESSES} className="pt-1" prefix="billing" />
        </div>
      )}

      <CompanyInvoiceFields />

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

const CompanyInvoiceFields = (): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const { control } = useCheckoutForm()
  const companyInvoice = useWatch({ control, name: "companyInvoice" })

  return (
    <div className="flex flex-col gap-5 border-t border-border/50 pt-4">
      <div className="w-fit">
        <CheckoutCheckboxField control={control} name="companyInvoice" label={t("companyInvoice")} />
      </div>
      {companyInvoice === true && (
        <div className="flex flex-col gap-5">
          <p className="text-xs leading-relaxed text-muted-foreground">{t("companyInvoiceHint")}</p>
          <FieldGroup className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <CheckoutTextField
              control={control}
              name="billingCompanyName"
              label={t("companyName")}
              className="sm:col-span-2"
              autoComplete="billing organization"
              maxLength={COMPANY_NAME_MAX_LENGTH}
              required
            />
            <CheckoutTextField control={control} name="billingNip" label={t("nip")} autoComplete="off" inputMode="numeric" required />
          </FieldGroup>
        </div>
      )}
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
  const listId = useId()
  const [listOpen, setListOpen] = useState(false)
  const toggleList = useCallback(() => {
    setListOpen((open) => !open)
  }, [])

  const selectAddress = useCallback<SelectAddress>(
    (addr, chosenFor) => {
      onSelect(addr, chosenFor)
      setListOpen(false)
    },
    [onSelect],
  )

  if (addresses.length === 0) {
    return (
      <div className="flex w-full items-center justify-between">
        <h3 className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">{heading}</h3>
        <span className="text-[10px] tracking-widest text-muted-foreground italic">{t("noSavedAddresses")}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full items-center justify-between">
        <h3 className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">{heading}</h3>
        <button
          type="button"
          aria-controls={listId}
          aria-expanded={listOpen}
          onClick={toggleList}
          className="min-h-6 cursor-pointer text-[10px] tracking-widest text-muted-foreground uppercase underline transition-colors hover:text-foreground pointer-coarse:min-h-10"
        >
          {t("savedAddresses")}
        </button>
      </div>
      <div id={listId} hidden={!listOpen} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {addresses.map((addr) => (
          <AddressCard key={`${prefix}-${addr.id}`} addr={addr} onSelect={selectAddress} prefix={prefix} />
        ))}
      </div>
    </div>
  )
}

const addressKey = (parts: readonly (string | null | undefined)[]): string =>
  parts.map((part) => part?.trim().toLocaleLowerCase()).join("\n")

const SaveAddressField = ({
  addresses,
  className,
  prefix,
}: Readonly<{
  addresses: readonly Address["select"][]
  className: string
  prefix: AddressPrefix
}>): JSX.Element | undefined => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const { control, setValue } = useCheckoutForm()
  const { data: session } = useQuery(getCurrentSessionQuery)
  const fields = ADDRESS_FIELDS[prefix]
  const typedAddress = useWatch({
    control,
    name: [fields.firstName, fields.lastName, fields.address1, fields.postalCode, fields.city, fields.countryCode],
  })

  const alreadySaved = useMemo(() => {
    const typedKey = addressKey(typedAddress)

    return addresses.some(
      (addr) => addressKey([addr.firstName, addr.lastName, addr.address1, addr.postalCode, addr.city, addr.countryCode]) === typedKey,
    )
  }, [addresses, typedAddress])

  useEffect(() => {
    if (alreadySaved) {
      setValue(fields.save, false)
    }
  }, [alreadySaved, fields.save, setValue])

  const signedIn = session !== null && session !== undefined
  if (!signedIn) {
    return undefined
  }

  if (alreadySaved) {
    return (
      <div className={className}>
        <CheckoutCheckboxField control={control} disabled name={fields.save} label={t("addressAlreadySaved")} />
      </div>
    )
  }

  return (
    <div className={className}>
      <CheckoutCheckboxField control={control} name={fields.save} label={t(fields.saveLabel)} />
    </div>
  )
}

const ADDRESS_FIELDS = {
  billing: {
    address1: "billingAddress1",
    city: "billingCity",
    countryCode: "billingCountryCode",
    firstName: "billingFirstName",
    lastName: "billingLastName",
    postalCode: "billingPostalCode",
    save: "saveBillingAddress",
    saveLabel: "saveBillingAddress",
  },
  shipping: {
    address1: "address1",
    city: "city",
    countryCode: "countryCode",
    firstName: "firstName",
    lastName: "lastName",
    postalCode: "postalCode",
    save: "saveShippingAddress",
    saveLabel: "saveShippingAddress",
  },
} as const

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

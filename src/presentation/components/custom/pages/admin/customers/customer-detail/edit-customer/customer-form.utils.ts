import { type User } from "~/src/modules/user/user.types"
const createEmptyAddressForm = (): NonNullable<User["adminCustomerFormValues"]["address"]> => ({
  address1: "",
  city: "",
  countryCode: "",
})
export const customerToFormValues = (customer: User["adminCustomerDetail"]): User["adminCustomerFormValues"] => ({
  address: customer.addressForm ?? createEmptyAddressForm(),
  customTags: [...customer.customTags],
  notes: customer.notes ?? "",
  phone: customer.phone ?? "",
})
export const createDefaultCustomerFormValues = (): User["adminCustomerFormValues"] => ({
  address: createEmptyAddressForm(),
  customTags: [],
  notes: "",
  phone: "",
})

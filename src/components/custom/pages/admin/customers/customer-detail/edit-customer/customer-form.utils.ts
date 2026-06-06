import type { User } from "~/src/modules/user/user.types";

function createEmptyAddressForm(): NonNullable<User["adminCustomerFormValues"]["address"]> {
  return {
    address1: "",
    city: "",
    countryCode: ""
  };
}

export function customerToFormValues(customer: User["adminCustomerDetail"]): User["adminCustomerFormValues"] {
  return {
    address: customer.addressForm ?? createEmptyAddressForm(),
    customTags: [...customer.customTags],
    notes: customer.notes ?? "",
    phone: customer.phone ?? ""
  };
}

export function createDefaultCustomerFormValues(): User["adminCustomerFormValues"] {
  return {
    address: createEmptyAddressForm(),
    customTags: [],
    notes: "",
    phone: ""
  };
}

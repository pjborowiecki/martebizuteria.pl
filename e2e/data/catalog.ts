export const PRODUCTS = {
  lapis: { handle: "lapis-lazuli-necklace", price: "PLN 379.00", sku: "MRT-0001", title: "Lapis Lazuli Necklace" },
  onyx: { handle: "onyx-necklace", price: "PLN 379.00", sku: "MRT-0002", title: "Onyx Necklace" },
} as const

export const COURIER = { name: /^Courier/u, price: "PLN 19.99" } as const

export const SHIPPING_ADDRESS = {
  address1: "Krucza 1",
  city: "Warszawa",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "501234567",
  postalCode: "00-001",
} as const

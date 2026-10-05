export const PRODUCTS = {
  lapis: { handle: "lapis-lazuli-necklace", price: "PLN 379.00", sku: "MRT-0001", title: "Lapis Lazuli Necklace" },
  onyx: { handle: "onyx-necklace", price: "PLN 379.00", sku: "MRT-0002", title: "Onyx Necklace" },
} as const

export const CATEGORIES = {
  necklaces: { handle: "naszyjniki", title: "Necklaces" },
} as const

export const COURIER = { id: "019f4a10-0001-7000-8000-000000000002", name: /^Courier/u, price: "PLN 19.99" } as const

export const IN_STORE_PICKUP = { name: /^In-Store Pickup/u } as const

export const PARCEL_LOCKER = { id: "019f4a10-0001-7000-8000-000000000001" } as const

export const WITHDRAWN_DELIVERY_METHOD = { id: "019f4a10-0001-7000-8000-0000000000ff" } as const

export const MENU_SHOWCASE = {
  newArrivalsImage: /\/collections\/efe53b1e9eddb9c2f16902d97df4d9b78279fae93cdf768a36be90bfbc7e8e30\.jpg/u,
  viewport: { height: 800, width: 1100 },
} as const

export const SHIPPING_ADDRESS = {
  address1: "Krucza 1",
  city: "Warszawa",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "501234567",
  postalCode: "00-001",
} as const

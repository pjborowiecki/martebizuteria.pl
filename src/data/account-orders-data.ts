export const PREBUILT_ORDER_ROUTE_IDS = ["ORD-2024-1847", "ORD-2024-1832", "ORD-2024-1801", "ORD-2024-1756", "ORD-2024-1698"] as const;

export const ORDERS = [
  {
    date: "December 18, 2024",
    id: "ORD-2024-1847",
    items: [
      {
        image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=200&q=80",
        name: "Lapis Lazuli Pendant",
        price: "€ 780.00",
        qty: 1
      },
      {
        image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=200&q=80",
        name: "Aurelia Gold Ring",
        price: "€ 460.00",
        qty: 1
      }
    ],
    status: "delivered",
    total: "€ 1,240.00"
  },
  {
    date: "December 12, 2024",
    id: "ORD-2024-1832",
    items: [
      {
        image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=200&q=80",
        name: "Heritage Silver Bracelet",
        price: "€ 680.00",
        qty: 1
      }
    ],
    status: "shipped",
    total: "€ 680.00"
  },
  {
    date: "December 4, 2024",
    id: "ORD-2024-1801",
    items: [
      {
        image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=200&q=80",
        name: "Pearl Drop Earrings",
        price: "€ 950.00",
        qty: 1
      },
      {
        image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=200&q=80",
        name: "Azure Necklace",
        price: "€ 1,400.00",
        qty: 1
      }
    ],
    status: "delivered",
    total: "€ 2,350.00"
  },
  {
    date: "November 22, 2024",
    id: "ORD-2024-1756",
    items: [
      {
        image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=200&q=80",
        name: "Midnight Choker",
        price: "€ 490.00",
        qty: 1
      }
    ],
    status: "delivered",
    total: "€ 490.00"
  },
  {
    date: "November 5, 2024",
    id: "ORD-2024-1698",
    items: [
      {
        image: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=200&q=80",
        name: "Aurelia Necklace Set",
        price: "€ 2,400.00",
        qty: 1
      },
      {
        image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=200&q=80",
        name: "Heritage Stud Earrings",
        price: "€ 720.00",
        qty: 1
      }
    ],
    status: "delivered",
    total: "€ 3,120.00"
  }
] as const;

export const DEMO_ORDER_ID = "ORD-2024-1847" as const;

export const ORDER_DETAIL = {
  billingAddress: {
    city: "Warsaw",
    country: "Poland",
    line1: "ul. Marszałkowska 42/12",
    name: "Maria Kowalska",
    postal: "00-624"
  },
  date: "December 18, 2024",
  deliveredDate: "December 21, 2024",
  id: DEMO_ORDER_ID,
  items: [
    {
      image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80",
      name: "Lapis Lazuli Pendant",
      price: "€ 780.00",
      qty: 1,
      variant: "18K Gold / 45cm Chain"
    },
    {
      image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=400&q=80",
      name: "Aurelia Gold Ring",
      price: "€ 460.00",
      qty: 1,
      variant: "Size 7 / Rose Gold"
    }
  ],
  paymentMethod: "Visa •••• 4242",
  shipping: "€ 0.00",
  shippingAddress: {
    city: "Warsaw",
    country: "Poland",
    line1: "ul. Marszałkowska 42/12",
    name: "Maria Kowalska",
    postal: "00-624"
  },
  shippingMethod: "Express Delivery",
  status: "delivered",
  subtotal: "€ 1,200.00",
  tax: "€ 40.00",
  timeline: [
    { date: "Dec 21, 14:32", event: "delivered" },
    { date: "Dec 20, 09:15", event: "outForDelivery" },
    { date: "Dec 19, 16:48", event: "inTransit" },
    { date: "Dec 18, 22:10", event: "shipped" },
    { date: "Dec 18, 18:05", event: "confirmed" },
    { date: "Dec 18, 18:02", event: "placed" }
  ],
  total: "€ 1,240.00",
  trackingNumber: "1Z999AA10123456784"
} as const;

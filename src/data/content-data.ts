import { FileText, Image as ImageIcon, Type, type LucideIcon } from "lucide-react";

export interface ContentType {
  key: "pages" | "banners" | "articles";
  icon: LucideIcon;
  count: number;
}

export const CONTENT_TYPES: ContentType[] = [
  { count: 8, icon: FileText, key: "pages" },
  { count: 4, icon: ImageIcon, key: "banners" },
  { count: 12, icon: Type, key: "articles" }
];

export const PAGES = [
  { id: "page-001", lastEdited: "Oct 24, 2023", path: "/", sections: 9, status: "published", title: "Homepage" },
  { id: "page-002", lastEdited: "Oct 22, 2023", path: "/brand", sections: 5, status: "published", title: "Brand — The Maison" },
  { id: "page-003", lastEdited: "Oct 20, 2023", path: "/products", sections: 3, status: "published", title: "All Products" },
  { id: "page-004", lastEdited: "Oct 18, 2023", path: "/collections/nova", sections: 4, status: "published", title: "Nova Collection" },
  {
    id: "page-005",
    lastEdited: "Oct 18, 2023",
    path: "/collections/celestial",
    sections: 4,
    status: "published",
    title: "Celestial Collection"
  },
  { id: "page-006", lastEdited: "Oct 25, 2023", path: "/lookbook/holiday-2023", sections: 6, status: "draft", title: "Holiday Lookbook" },
  { id: "page-007", lastEdited: "Sep 12, 2023", path: "/about", sections: 3, status: "published", title: "About" },
  { id: "page-008", lastEdited: "Sep 10, 2023", path: "/contact", sections: 2, status: "published", title: "Contact" }
] as const;

export type Page = (typeof PAGES)[number];

import {
  buildAuditChangeMetadata,
  formatAuditDetailFromChanges,
  toAuditMetadataRecord,
  type AuditChangeMetadata
} from "~/src/modules/audit-log/audit-log.diff.utils";
import type { AdminProductDetail } from "~/src/modules/product/product.utils";

const ZERO_STOCK = 0;

export interface ProductAuditVariantSnapshot {
  readonly price: number;
  readonly quantity: number;
  readonly sku: string;
}

export interface ProductAuditSnapshot {
  readonly status: string;
  readonly totalStock: number;
  readonly variants: readonly ProductAuditVariantSnapshot[];
}

const PRODUCT_AUDIT_FIELD_LABELS = {
  status: "Status",
  totalStock: "Stock",
  variants: "Variants"
} as const;

function normalizeVariantSnapshots(product: AdminProductDetail): ProductAuditVariantSnapshot[] {
  return product.variants
    .map((variant) => ({
      price: variant.price,
      quantity: variant.inventory?.quantityAvailable ?? ZERO_STOCK,
      sku: variant.sku ?? ""
    }))
    .toSorted((left, right) => left.sku.localeCompare(right.sku));
}

export function extractProductAuditSnapshot(product: AdminProductDetail): ProductAuditSnapshot {
  const variants = normalizeVariantSnapshots(product);

  return {
    status: product.status,
    totalStock: variants.reduce((sum, variant) => sum + variant.quantity, ZERO_STOCK),
    variants
  };
}

function variantsChanged(before: readonly ProductAuditVariantSnapshot[], after: readonly ProductAuditVariantSnapshot[]): boolean {
  if (before.length !== after.length) {
    return true;
  }

  return before.some((variant, index) => {
    const next = after[index];
    return variant.price !== next?.price || variant.quantity !== next?.quantity || variant.sku !== next?.sku;
  });
}

export function buildProductAuditChange(
  before: ProductAuditSnapshot | undefined,
  after: ProductAuditSnapshot
): { detail?: string; metadata?: Record<string, unknown> } {
  if (before === undefined) {
    return {};
  }

  const baseChange = buildAuditChangeMetadata(before, after, ["status", "totalStock"]);
  const hasVariantChange = variantsChanged(before.variants, after.variants);

  if (baseChange === undefined && !hasVariantChange) {
    return {};
  }

  const changed = [...(baseChange?.changed ?? [])];

  if (hasVariantChange) {
    changed.push("variants");
  }

  const metadata: AuditChangeMetadata<ProductAuditSnapshot, ProductAuditSnapshot> = {
    changed,
    new: {
      ...baseChange?.new,
      ...(hasVariantChange ? { variants: [...after.variants] } : {})
    },
    old: {
      ...baseChange?.old,
      ...(hasVariantChange ? { variants: [...before.variants] } : {})
    }
  };

  const detailParts = formatAuditDetailFromChanges(PRODUCT_AUDIT_FIELD_LABELS, metadata);
  const variantDetail = hasVariantChange ? "Variants updated" : undefined;

  return {
    detail: [detailParts, variantDetail].filter((part) => part !== undefined && part !== "").join("; ") || undefined,
    metadata: toAuditMetadataRecord(metadata)
  };
}

import { type JSX, type KeyboardEvent, useCallback, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { ProductEditorBasic } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-basic";
import { ProductEditorHeader } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-header";
import { ProductEditorMedia } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-media";
import { ProductEditorOrganization } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-organization";
import { ProductEditorPricing } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-pricing";
import { ProductEditorSeo } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-seo";
import { ProductEditorSidebar } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-sidebar";
import { ProductEditorVariants } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-variants";

import { PRODUCTS, type ProductVariant } from "~/src/data/catalog-data";

export const Route = createFileRoute("/{-$locale}/admin/catalog/products/$handle")({
  component: AdminProductDetailRoute
});

function AdminProductDetailRoute(): JSX.Element {
  const { handle } = Route.useParams();
  const isNew = handle === "new";
  const initialData = isNew ? undefined : PRODUCTS.find((p) => p.id === handle);

  const [tags, setTags] = useState<readonly string[]>(["handcrafted", "luxury"]);
  const [tagInput, setTagInput] = useState("");
  const [variants, setVariants] = useState<readonly ProductVariant[]>([{ id: 1, name: "Small", price: "", stock: "" }]);
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed !== "" && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  }, [tags, tagInput]);

  const removeTag = useCallback(
    (tag: string) => {
      setTags(tags.filter((t) => t !== tag));
    },
    [tags]
  );

  const addVariant = useCallback(() => {
    setVariants([...variants, { id: Date.now(), name: "", price: "", stock: "" }]);
  }, [variants]);

  const removeVariant = useCallback(
    (id: number) => {
      setVariants(variants.filter((v) => v.id !== id));
    },
    [variants]
  );

  const updateVariant = useCallback(
    (id: number, field: keyof ProductVariant, value: string) => {
      setVariants(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
    },
    [variants]
  );

  const handleTagInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag();
      }
    },
    [addTag]
  );

  return (
    <div className="flex flex-1 flex-col bg-muted/20">
      <ProductEditorHeader status={status} isNew={isNew} handle={handle} />

      <div className="flex-1">
        <div className="mx-auto grid w-full gap-x-10 gap-y-0 px-8 py-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <ProductEditorBasic initialData={initialData} />
            <div className="grid grid-cols-2 gap-6">
              <ProductEditorOrganization />
              <ProductEditorPricing initialData={initialData} />
            </div>
            <ProductEditorMedia />
            <ProductEditorVariants onAdd={addVariant} onRemove={removeVariant} onUpdate={updateVariant} variants={variants} />
            <ProductEditorSeo />
          </div>

          <ProductEditorSidebar
            onAddTag={addTag}
            onRemoveTag={removeTag}
            onStatusChange={setStatus}
            onTagInputChange={setTagInput}
            onTagInputKeyDown={handleTagInputKeyDown}
            status={status}
            tagInput={tagInput}
            tags={tags}
          />
        </div>
      </div>
    </div>
  );
}

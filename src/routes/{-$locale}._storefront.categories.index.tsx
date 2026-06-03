import { type JSX, useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { LocalizedLink } from "~/src/components/custom/localized-link";

import { categoryQueryOptions } from "~/src/modules/category/category.queries";
import type { Category } from "~/src/modules/category/category.types";

export const Route = createFileRoute("/{-$locale}/_storefront/categories/")({
  component: CategoriesPage,
  head: () => ({
    meta: [{ title: `Categories | ${CONSTANTS.APP_NAME}` }, { content: "Browse by category.", name: "description" }]
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(categoryQueryOptions.categoriesQueryOptions());
  }
});

function CategoriesPage(): JSX.Element {
  const t = useTranslations("categoriesPage");
  const { data: categories } = useSuspenseQuery(categoryQueryOptions.categoriesQueryOptions());

  const [firstCategory] = categories;

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mb-8 text-muted-foreground">{t("description")}</p>

        {firstCategory === undefined && <p>{t("noCategoriesFound")}</p>}
        {firstCategory !== undefined && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function CategoryCard({
  category
}: Readonly<{
  category: Pick<Category["select"], "id" | "title" | "handle" | "description">;
}>): JSX.Element {
  const params = useMemo(() => ({ handle: category.handle }), [category.handle]);

  return (
    <LocalizedLink
      to={CONSTANTS.ROUTES.CATEGORY}
      params={params}
      className="group block rounded-xl border bg-card p-6 text-card-foreground transition-all hover:shadow-md"
    >
      <h2 className="text-xl font-semibold group-hover:underline">{category.title}</h2>
      {category.description !== null && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{category.description}</p>}
    </LocalizedLink>
  );
}

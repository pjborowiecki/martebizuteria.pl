import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$locale}/admin/catalog/categories/$handle")({
  beforeLoad: () => {
    redirect({
      throw: true,
      to: "/{-$locale}/admin/catalog/categories"
    });
  }
});

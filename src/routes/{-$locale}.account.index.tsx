import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$locale}/account/")({
  beforeLoad: () => {
    redirect({ throw: true, to: "/{-$locale}/account/overview" });
  }
});

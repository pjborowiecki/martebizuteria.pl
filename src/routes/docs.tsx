import { type JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { loadDocsNavigation } from "~/src/integrations/fumadocs/fumadocs.docs"

import { DocsSidebar } from "~/src/presentation/components/custom/pages/docs/docs-sidebar"
import { Footer } from "~/src/presentation/components/custom/pages/landing-page/footer/footer"
import { Navigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation"

const DocumentationLayout = (): JSX.Element => {
  const { sections } = Route.useLoaderData()

  return (
    <div className="flex min-h-dvh flex-col">
      <Navigation />
      <main className="mx-auto w-full max-w-400 flex-1 px-6 font-light lg:px-12">
        <div className="grid gap-x-16 gap-y-10 py-12 lg:grid-cols-[240px_1fr] lg:py-20">
          <DocsSidebar sections={sections} />
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export const Route = createFileRoute("/docs")({
  component: DocumentationLayout,
  loader: () => loadDocsNavigation(),
  staticData: {
    namespaces: ["pages.docs"],
  },
})

import { type JSX, type ReactNode } from "react"

import { cn } from "cn"

import { useNavigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider"

export const NavigationHeader = ({
  children,
}: Readonly<{
  children: ReactNode
}>): JSX.Element => {
  const { scrolled } = useNavigation()

  return (
    <header className="sticky top-0 z-40 w-full bg-background/90 backdrop-blur-md">
      <div
        className={cn(
          "storefront-container flex h-20 items-center border-b border-transparent transition-[border-color] duration-500 ease-out",
          { "border-border": scrolled },
        )}
      >
        {children}
      </div>
    </header>
  )
}

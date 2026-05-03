"use client";

import type { JSX, ReactNode } from "react";

import { cn } from "~/src/lib/utils";

import { useNavigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider";

export function NavigationHeader({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  const { scrolled } = useNavigation();

  return (
    <header className="sticky top-0 z-110 w-full bg-background/90 backdrop-blur-md">
      <div
        className={cn(
          "mx-auto flex h-20 max-w-400 items-center border-b border-transparent px-6 transition-[border-color] duration-500 ease-out lg:px-12",
          { "border-border": scrolled }
        )}
      >
        {children}
      </div>
    </header>
  );
}

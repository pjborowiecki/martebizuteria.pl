"use client";

import { type JSX, type ReactNode, useCallback } from "react";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";

import { useNavigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider";

interface NavLinkProps {
  hash: string;
  active?: boolean;
  children: ReactNode;
}

export function NavLink({ hash, active = false, children }: Readonly<NavLinkProps>): JSX.Element {
  const { handleNavigateToHash, getHoverProps } = useNavigation();
  const hover = getHoverProps({ scale: 1 });

  const handleMouseEnter = hover.onMouseEnter;
  const handleMouseLeave = hover.onMouseLeave;
  const handleLinkClick = useCallback(() => {
    handleNavigateToHash(hash);
  }, [handleNavigateToHash, hash]);

  return (
    <Button
      variant="ghost"
      onClick={handleLinkClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-current={active ? "page" : undefined}
      className={cn(
        "font-inherit relative flex h-10 cursor-pointer items-center overflow-visible rounded-none border-0 bg-transparent px-0 text-xs tracking-[0.25em] uppercase outline-none",
        "transition-colors hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-1 focus-visible:ring-ring/40",
        { "text-foreground": active, "text-muted-foreground hover:text-foreground": !active }
      )}
    >
      <span ref={hover.ref} className="relative z-10 inline-block will-change-transform">
        {children}
      </span>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 h-px w-full origin-center bg-current transition-transform duration-500 ease-out motion-reduce:transition-none",
          { "scale-x-0 opacity-75 group-hover/button:scale-x-100": !active, "scale-x-100 opacity-[0.92]": active }
        )}
      />
    </Button>
  );
}

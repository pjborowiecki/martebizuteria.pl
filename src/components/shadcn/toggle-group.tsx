"";

import { type CSSProperties, createContext, type JSX, useContext, useMemo } from "react";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";

import { cn } from "~/src/lib/utils";

import { toggleVariants } from "~/src/components/shadcn/toggle";

const DEFAULT_SPACING = 0;

type ToggleGroupContextValue = VariantProps<typeof toggleVariants> & {
  readonly spacing?: number;
  readonly orientation?: "horizontal" | "vertical";
};

const ToggleGroupContext = createContext<ToggleGroupContextValue>({
  orientation: "horizontal",
  size: "default",
  spacing: DEFAULT_SPACING,
  variant: "default"
});

interface ToggleGroupProps extends ToggleGroupPrimitive.Props, VariantProps<typeof toggleVariants> {
  readonly spacing?: number;
  readonly orientation?: "horizontal" | "vertical";
}

function ToggleGroup({
  className,
  variant,
  size,
  spacing = DEFAULT_SPACING,
  orientation = "horizontal",
  children,
  ...props
}: Readonly<ToggleGroupProps>): JSX.Element {
  const contextValue = useMemo(() => ({ orientation, size, spacing, variant }), [orientation, size, spacing, variant]);

  const groupStyle = useMemo((): Record<string, number> & CSSProperties => ({ "--gap": spacing }), [spacing]);

  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={groupStyle}
      className={cn(
        "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-lg data-[spacing=0]:overflow-hidden data-vertical:flex-col data-vertical:items-stretch",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={contextValue}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

interface ToggleGroupItemProps extends TogglePrimitive.Props, VariantProps<typeof toggleVariants> {}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: Readonly<ToggleGroupItemProps>): JSX.Element {
  const context = useContext(ToggleGroupContext);

  const resolvedVariant = context.variant ?? variant;
  const resolvedSize = context.size ?? size;

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      data-spacing={context.spacing}
      className={cn(
        "shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5 group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-none group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-none group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-none group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-none group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        toggleVariants({
          size: resolvedSize,
          variant: resolvedVariant
        }),
        className
      )}
      {...props}
    >
      {children}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };

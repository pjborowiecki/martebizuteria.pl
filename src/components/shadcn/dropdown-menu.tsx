import type { ComponentProps, JSX } from "react";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CheckIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "~/src/lib/utils";

// --- Constants ---

const DEFAULT_ALIGN_OFFSET = 0;
const DEFAULT_SIDE_OFFSET = 4;
const SUB_ALIGN_OFFSET = -3;
const SUB_SIDE_OFFSET = 0;

// --- Components ---

function DropdownMenu({ ...props }: Readonly<MenuPrimitive.Root.Props>): JSX.Element {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: Readonly<MenuPrimitive.Portal.Props>): JSX.Element {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({ ...props }: Readonly<MenuPrimitive.Trigger.Props>): JSX.Element {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

interface DropdownMenuContentProps extends MenuPrimitive.Popup.Props {
  readonly align?: MenuPrimitive.Positioner.Props["align"];
  readonly alignOffset?: MenuPrimitive.Positioner.Props["alignOffset"];
  readonly side?: MenuPrimitive.Positioner.Props["side"];
  readonly sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
}

function DropdownMenuContent({
  align = "start",
  alignOffset = DEFAULT_ALIGN_OFFSET,
  className,
  side = "bottom",
  sideOffset = DEFAULT_SIDE_OFFSET,
  ...props
}: Readonly<DropdownMenuContentProps>): JSX.Element {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50 outline-none"
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          className={cn(
            "z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          data-slot="dropdown-menu-content"
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: Readonly<MenuPrimitive.Group.Props>): JSX.Element {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

interface DropdownMenuLabelProps extends MenuPrimitive.GroupLabel.Props {
  readonly inset?: boolean;
}

function DropdownMenuLabel({ className, inset, ...props }: Readonly<DropdownMenuLabelProps>): JSX.Element {
  return (
    <MenuPrimitive.GroupLabel
      className={cn("px-2 py-2 text-xs text-muted-foreground data-inset:pl-7", className)}
      data-inset={inset}
      data-slot="dropdown-menu-label"
      {...props}
    />
  );
}

interface DropdownMenuItemProps extends MenuPrimitive.Item.Props {
  readonly inset?: boolean;
  readonly variant?: "default" | "destructive";
}

function DropdownMenuItem({ className, inset, variant = "default", ...props }: Readonly<DropdownMenuItemProps>): JSX.Element {
  return (
    <MenuPrimitive.Item
      className={cn(
        "group/dropdown-menu-item relative flex cursor-default items-center gap-2 rounded-lg px-2 py-2 text-xs outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        className
      )}
      data-inset={inset}
      data-slot="dropdown-menu-item"
      data-variant={variant}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: Readonly<MenuPrimitive.SubmenuRoot.Props>): JSX.Element {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

interface DropdownMenuSubTriggerProps extends MenuPrimitive.SubmenuTrigger.Props {
  readonly inset?: boolean;
}

function DropdownMenuSubTrigger({ children, className, inset, ...props }: Readonly<DropdownMenuSubTriggerProps>): JSX.Element {
  return (
    <MenuPrimitive.SubmenuTrigger
      className={cn(
        "flex cursor-default items-center gap-2 rounded-lg px-2 py-2 text-xs outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-popup-open:bg-accent data-popup-open:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      data-inset={inset}
      data-slot="dropdown-menu-sub-trigger"
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = SUB_ALIGN_OFFSET,
  className,
  side = "right",
  sideOffset = SUB_SIDE_OFFSET,
  ...props
}: Readonly<ComponentProps<typeof DropdownMenuContent>>): JSX.Element {
  return (
    <DropdownMenuContent
      align={align}
      alignOffset={alignOffset}
      className={cn(
        "w-auto min-w-[96px] rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        className
      )}
      data-slot="dropdown-menu-sub-content"
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

interface DropdownMenuCheckboxItemProps extends MenuPrimitive.CheckboxItem.Props {
  readonly inset?: boolean;
}

function DropdownMenuCheckboxItem({ checked, children, className, inset, ...props }: Readonly<DropdownMenuCheckboxItemProps>): JSX.Element {
  return (
    <MenuPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-lg py-2 pr-8 pl-2 text-xs outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      data-inset={inset}
      data-slot="dropdown-menu-checkbox-item"
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({ ...props }: Readonly<MenuPrimitive.RadioGroup.Props>): JSX.Element {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

interface DropdownMenuRadioItemProps extends MenuPrimitive.RadioItem.Props {
  readonly inset?: boolean;
}

function DropdownMenuRadioItem({ children, className, inset, ...props }: Readonly<DropdownMenuRadioItemProps>): JSX.Element {
  return (
    <MenuPrimitive.RadioItem
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-lg py-2 pr-8 pl-2 text-xs outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      data-inset={inset}
      data-slot="dropdown-menu-radio-item"
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuSeparator({ className, ...props }: Readonly<MenuPrimitive.Separator.Props>): JSX.Element {
  return <MenuPrimitive.Separator className={cn("-mx-1 h-px bg-border", className)} data-slot="dropdown-menu-separator" {...props} />;
}

function DropdownMenuShortcut({ className, ...props }: Readonly<ComponentProps<"span">>): JSX.Element {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
        className
      )}
      data-slot="dropdown-menu-shortcut"
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
};

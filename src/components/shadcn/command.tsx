"use client";

import type { ComponentProps, JSX, ReactNode } from "react";

import { Command as CommandPrimitive } from "cmdk";
import { CheckIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/src/components/shadcn/dialog";
import { InputGroup, InputGroupAddon } from "~/src/components/shadcn/input-group";

interface CommandDialogProps extends Omit<ComponentProps<typeof Dialog>, "children"> {
  readonly children: ReactNode;
  readonly className?: string;
  readonly description?: string;
  readonly showCloseButton?: boolean;
  readonly title?: string;
}

function Command({ className, ...props }: Readonly<ComponentProps<typeof CommandPrimitive>>): JSX.Element {
  return (
    <CommandPrimitive
      className={cn("flex size-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground", className)}
      data-slot="command"
      {...props}
    />
  );
}

function CommandDialog({
  children,
  className,
  description,
  showCloseButton = false,
  title,
  ...props
}: Readonly<CommandDialogProps>): JSX.Element {
  const t = useTranslations("components.shadcn.command");

  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title ?? t("title")}</DialogTitle>
        <DialogDescription>{description ?? t("description")}</DialogDescription>
      </DialogHeader>
      <DialogContent className={cn("top-1/3 translate-y-0 overflow-hidden rounded-lg p-0", className)} showCloseButton={showCloseButton}>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({ className, ...props }: Readonly<ComponentProps<typeof CommandPrimitive.Input>>): JSX.Element {
  return (
    <div className="border-b pb-0" data-slot="command-input-wrapper">
      <InputGroup className="h-8 border-none border-input/30 bg-input/30 shadow-none! *:data-[slot=input-group-addon]:pl-2!">
        <CommandPrimitive.Input
          className={cn("w-full text-xs outline-hidden disabled:cursor-not-allowed disabled:opacity-50", className)}
          data-slot="command-input"
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

function CommandList({ className, ...props }: Readonly<ComponentProps<typeof CommandPrimitive.List>>): JSX.Element {
  return (
    <CommandPrimitive.List
      className={cn("no-scrollbar max-h-72 scroll-py-0 overflow-x-hidden overflow-y-auto outline-none", className)}
      data-slot="command-list"
      {...props}
    />
  );
}

function CommandEmpty({ className, ...props }: Readonly<ComponentProps<typeof CommandPrimitive.Empty>>): JSX.Element {
  return <CommandPrimitive.Empty className={cn("py-6 text-center text-xs", className)} data-slot="command-empty" {...props} />;
}

function CommandGroup({ className, ...props }: Readonly<ComponentProps<typeof CommandPrimitive.Group>>): JSX.Element {
  return (
    <CommandPrimitive.Group
      className={cn(
        "overflow-hidden text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      data-slot="command-group"
      {...props}
    />
  );
}

function CommandSeparator({ className, ...props }: Readonly<ComponentProps<typeof CommandPrimitive.Separator>>): JSX.Element {
  return <CommandPrimitive.Separator className={cn("-mx-1 h-px bg-border", className)} data-slot="command-separator" {...props} />;
}

function CommandItem({ children, className, ...props }: Readonly<ComponentProps<typeof CommandPrimitive.Item>>): JSX.Element {
  return (
    <CommandPrimitive.Item
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-lg px-2 py-2 text-xs outline-hidden select-none in-data-[slot=dialog-content]:rounded-lg! data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:*:[svg]:text-foreground",
        className
      )}
      data-slot="command-item"
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  );
}

function CommandShortcut({ className, ...props }: Readonly<ComponentProps<"span">>): JSX.Element {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground", className)}
      data-slot="command-shortcut"
      {...props}
    />
  );
}

export { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut };

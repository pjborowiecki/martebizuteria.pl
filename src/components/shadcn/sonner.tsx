"use client";

import type { CSSProperties, JSX } from "react";

import { useTheme } from "@wrksz/themes/client";
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const TOASTER_ICONS: ToasterProps["icons"] = {
  error: <OctagonXIcon className="size-4" />,
  info: <InfoIcon className="size-4" />,
  loading: <Loader2Icon className="size-4 animate-spin" />,
  success: <CircleCheckIcon className="size-4" />,
  warning: <TriangleAlertIcon className="size-4" />
};

const TOASTER_STYLE: Record<string, string> & CSSProperties = {
  "--border-radius": "var(--radius)",
  "--normal-bg": "var(--popover)",
  "--normal-border": "var(--border)",
  "--normal-text": "var(--popover-foreground)"
};

const TOASTER_OPTIONS: ToasterProps["toastOptions"] = {
  classNames: {
    toast: "cn-toast"
  }
};

const Toaster = ({ ...props }: Readonly<ToasterProps>): JSX.Element => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={TOASTER_ICONS}
      style={TOASTER_STYLE}
      toastOptions={TOASTER_OPTIONS}
      {...props}
    />
  );
};

export { Toaster };

import { type CSSProperties, type JSX } from "react"

import { useTheme } from "@wrksz/themes/client"
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"
import { Toaster as Sonner, type ToasterProps as SonnerToasterProps } from "sonner"

const TOASTER_ICONS: SonnerToasterProps["icons"] = {
  error: <OctagonXIcon className="size-4" />,
  info: <InfoIcon className="size-4" />,
  loading: <Loader2Icon className="size-4 animate-spin" />,
  success: <CircleCheckIcon className="size-4" />,
  warning: <TriangleAlertIcon className="size-4" />,
}

const DEFAULT_TOASTER_STYLE: Record<string, string> & CSSProperties = {
  "--border-radius": "var(--radius)",
  "--normal-bg": "var(--popover)",
  "--normal-border": "var(--border)",
  "--normal-text": "var(--popover-foreground)",
}

const ADMIN_TOASTER_STYLE: Record<string, string> & CSSProperties = {
  "--border-radius": "var(--radius)",
  "--error-bg": "var(--sidebar)",
  "--error-border": "var(--sidebar-border)",
  "--error-text": "var(--sidebar-foreground)",
  "--info-bg": "var(--sidebar)",
  "--info-border": "var(--sidebar-border)",
  "--info-text": "var(--sidebar-foreground)",
  "--normal-bg": "var(--sidebar)",
  "--normal-bg-hover": "var(--sidebar-accent)",
  "--normal-border": "var(--sidebar-border)",
  "--normal-border-hover": "var(--sidebar-border)",
  "--normal-text": "var(--sidebar-foreground)",
  "--success-bg": "var(--sidebar)",
  "--success-border": "var(--sidebar-border)",
  "--success-text": "var(--sidebar-foreground)",
  "--warning-bg": "var(--sidebar)",
  "--warning-border": "var(--sidebar-border)",
  "--warning-text": "var(--sidebar-foreground)",
}

const DEFAULT_TOAST_OPTIONS: SonnerToasterProps["toastOptions"] = {
  classNames: {
    toast: "cn-toast",
  },
}

const ADMIN_TOAST_OPTIONS: SonnerToasterProps["toastOptions"] = {
  classNames: {
    toast: "cn-toast",
  },
}

export type ToasterVariant = "admin" | "default"

export interface ToasterProps extends SonnerToasterProps {
  readonly variant?: ToasterVariant
}

const Toaster = ({ variant = "default", ...props }: Readonly<ToasterProps>): JSX.Element => {
  const { theme = "system" } = useTheme()
  const isAdminVariant = variant === "admin"

  return (
    <Sonner
      theme={isAdminVariant ? "dark" : theme}
      className={isAdminVariant ? "toaster toaster-admin group" : "toaster group"}
      position="top-right"
      closeButton
      icons={TOASTER_ICONS}
      style={isAdminVariant ? ADMIN_TOASTER_STYLE : DEFAULT_TOASTER_STYLE}
      toastOptions={isAdminVariant ? ADMIN_TOAST_OPTIONS : DEFAULT_TOAST_OPTIONS}
      {...props}
    />
  )
}

export { Toaster }

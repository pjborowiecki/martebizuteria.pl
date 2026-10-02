import { type JSX, type MouseEvent, useCallback, useMemo } from "react"

import { useLocation, useRouter } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"
import { cn } from "cn"
import {
  BookOpen,
  ChevronRight,
  FolderOpen,
  Gift,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  ScrollText,
  Settings,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  Users,
} from "lucide-react"
import { useTranslations } from "use-intl/react"

import { signOut } from "~/src/integrations/better-auth/auth.client"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/src/presentation/components/shadcn/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "~/src/presentation/components/shadcn/sidebar"

import { LocalizedLink, type LocalizedTo } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const signOutRequest = createClientOnlyFn((input: Parameters<typeof signOut>[0]) => signOut(input))

const matchRoute = (pathname: string, href: string): boolean => {
  if (href === ROUTES.ADMIN_OVERVIEW) {
    return pathname.endsWith(ROUTES.ADMIN_OVERVIEW)
  }

  if (href === ROUTES.ADMIN_CATALOG) {
    return pathname.endsWith(ROUTES.ADMIN_CATALOG) || pathname.includes(`${ROUTES.ADMIN_CATALOG}/new`)
  }

  return pathname.includes(href)
}

export const AdminSidebar = (): JSX.Element => {
  const router = useRouter()
  const { pathname } = useLocation()
  const isCatalogRoute = pathname.includes(ROUTES.ADMIN_CATALOG)
  const handleCatalogClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (!isCatalogRoute) {
        event.preventDefault()
        void router.navigate({
          to: ROUTES.ADMIN_PRODUCTS,
        })
      }
    },
    [isCatalogRoute, router],
  )

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <AdminSidebarHeader />
      <AdminSidebarContent pathname={pathname} isCatalogRoute={isCatalogRoute} handleCatalogClick={handleCatalogClick} />

      <SidebarGroup className="mt-auto p-2 group-data-[collapsible=icon]:p-0">
        <SidebarMenu>
          <AdminSidebarNavItems items={SYSTEM_NAV} pathname={pathname} />
        </SidebarMenu>
      </SidebarGroup>

      <AdminSidebarFooter />
    </Sidebar>
  )
}

const AdminSidebarHeader = (): JSX.Element => (
  <SidebarHeader className="flex h-16 justify-center border-b border-sidebar-border p-2">
    <SidebarMenu>
      <AdminSidebarHeaderBrand />
    </SidebarMenu>
  </SidebarHeader>
)

const AdminSidebarHeaderBrand = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const homeLink = useMemo(() => <LocalizedLink to={ROUTES.HOME} />, [])

  return (
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" render={homeLink} className="hover:bg-transparent active:bg-transparent">
        <div data-sidebar-icon className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground">
          <Gift className="size-5 text-background" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold tracking-tight">{t("brand")}</p>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

const AdminSidebarContent = ({
  pathname,
  isCatalogRoute,
  handleCatalogClick,
}: {
  readonly pathname: string
  readonly isCatalogRoute: boolean
  readonly handleCatalogClick: (event: MouseEvent<HTMLButtonElement>) => void
}): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] font-medium tracking-[0.12em] text-sidebar-foreground/40 uppercase">
          {t("nav.main")}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <AdminSidebarMainGroup pathname={pathname} isCatalogRoute={isCatalogRoute} handleCatalogClick={handleCatalogClick} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] font-medium tracking-[0.12em] text-sidebar-foreground/40 uppercase">
          {t("nav.tools")}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <AdminSidebarNavItems items={TOOLS_NAV} pathname={pathname} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}

const AdminSidebarMainGroup = ({
  pathname,
  isCatalogRoute,
  handleCatalogClick,
}: {
  readonly pathname: string
  readonly isCatalogRoute: boolean
  readonly handleCatalogClick: (event: MouseEvent<HTMLButtonElement>) => void
}): JSX.Element => {
  const t = useTranslations("pages.admin")
  const adminLink = useMemo(() => <LocalizedLink to={ROUTES.ADMIN_OVERVIEW} />, [])
  const catalogTriggerButton = useMemo(
    () => (
      <SidebarMenuButton
        isActive={isCatalogRoute}
        tooltip={t("nav.catalog")}
        size="default"
        className={cn(isCatalogRoute && "bg-sidebar-accent font-medium")}
        onClick={handleCatalogClick}
      />
    ),
    [isCatalogRoute, t, handleCatalogClick],
  )

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={matchRoute(pathname, ROUTES.ADMIN_OVERVIEW)}
          tooltip={t("nav.dashboard")}
          size="default"
          render={adminLink}
          className={cn(matchRoute(pathname, ROUTES.ADMIN_OVERVIEW) && "bg-sidebar-accent font-medium")}
        >
          <LayoutDashboard className="size-4" strokeWidth={1.5} />
          <span className="text-[13px]">{t("nav.dashboard")}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <Collapsible defaultOpen={isCatalogRoute} className="group/collapsible">
          <CollapsibleTrigger render={catalogTriggerButton}>
            <Package className="size-4" strokeWidth={1.5} />
            <span className="flex-1 text-[13px]">{t("nav.catalog")}</span>
            <ChevronRight
              className="size-3.5 text-sidebar-foreground/30 transition-transform duration-200 group-data-panel-open/collapsible:rotate-90 group-data-[collapsible=icon]:hidden"
              strokeWidth={1.5}
            />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <AdminSidebarCatalogSubMenu pathname={pathname} />
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>

      <AdminSidebarNavItems items={SIMPLE_NAV_ITEMS} pathname={pathname} />
    </>
  )
}

const AdminSidebarFooter = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const router = useRouter()
  const handleSignOut = useCallback(async () => {
    await signOutRequest({
      fetchOptions: {
        onSuccess: () => {
          globalThis.location.href = router.buildLocation({
            to: ROUTES.AUTH_SIGN_IN,
          }).publicHref
        },
      },
    })
  }, [router])

  const onSignOutClick = useCallback(() => {
    void handleSignOut()
  }, [handleSignOut])

  return (
    <SidebarFooter className="pb-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" tooltip={t("user.signOut")} onClick={onSignOutClick}>
            <LogOut className="size-4" strokeWidth={1.5} />
            <span className="text-[13px]">{t("user.signOut")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}

const AdminSidebarCatalogSubItem = ({ sub, pathname }: { readonly sub: NavItem; readonly pathname: string }): JSX.Element => {
  const t = useTranslations("pages.admin")
  const subActive = matchRoute(pathname, sub.href)
  const link = useMemo(() => <LocalizedLink to={sub.href} />, [sub.href])

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton isActive={subActive} render={link}>
        <sub.icon className="size-3.5" strokeWidth={1.5} />
        <span>{t(sub.labelKey)}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

const AdminSidebarCatalogSubMenu = ({ pathname }: { readonly pathname: string }): JSX.Element => (
  <SidebarMenuSub>
    {CATALOG_SUB.map((sub) => (
      <AdminSidebarCatalogSubItem key={sub.href} sub={sub} pathname={pathname} />
    ))}
  </SidebarMenuSub>
)

const AdminSidebarNavItem = ({ item, pathname }: { readonly item: NavItem; readonly pathname: string }): JSX.Element => {
  const t = useTranslations("pages.admin")
  const isDisabled = item.disabled === true
  const active = !isDisabled && matchRoute(pathname, item.href)
  const link = useMemo(() => <LocalizedLink to={item.href} />, [item.href])
  if (isDisabled) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton disabled tooltip={t(item.labelKey)} size="default" className="cursor-not-allowed opacity-50">
          <item.icon className="size-4" strokeWidth={1.5} />
          <span className="text-[13px]">{t(item.labelKey)}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={t(item.labelKey)}
        size="default"
        render={link}
        className={cn(active && "bg-sidebar-accent font-medium")}
      >
        <item.icon className="size-4" strokeWidth={1.5} />
        <span className="text-[13px]">{t(item.labelKey)}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

const AdminSidebarNavItems = ({ items, pathname }: { readonly items: readonly NavItem[]; readonly pathname: string }): JSX.Element => (
  <>
    {items.map((item) => (
      <AdminSidebarNavItem key={item.href} item={item} pathname={pathname} />
    ))}
  </>
)

interface NavItem {
  readonly href: LocalizedTo
  readonly icon: typeof LayoutDashboard
  readonly labelKey: string
  readonly disabled?: boolean
}

const SIMPLE_NAV: readonly NavItem[] = [
  {
    href: ROUTES.ADMIN_OVERVIEW,
    icon: LayoutDashboard,
    labelKey: "nav.dashboard",
  },
  {
    href: ROUTES.ADMIN_ORDERS,
    icon: ShoppingCart,
    labelKey: "nav.orders",
  },
  {
    href: ROUTES.ADMIN_CUSTOMERS,
    icon: Users,
    labelKey: "nav.customers",
  },
]

const SIMPLE_NAV_ITEMS = SIMPLE_NAV.filter((item) => item.href !== ROUTES.ADMIN_OVERVIEW)

const CATALOG_SUB: readonly NavItem[] = [
  {
    href: ROUTES.ADMIN_PRODUCTS,
    icon: ShoppingBag,
    labelKey: "nav.products",
  },
  {
    href: ROUTES.ADMIN_CATEGORIES,
    icon: FolderOpen,
    labelKey: "nav.categories",
  },
  {
    href: ROUTES.ADMIN_COLLECTIONS,
    icon: Layers,
    labelKey: "nav.collections",
  },
  {
    href: ROUTES.ADMIN_ATTRIBUTES,
    icon: SlidersHorizontal,
    labelKey: "nav.attributes",
  },
]

const TOOLS_NAV: readonly NavItem[] = [
  {
    disabled: true,
    href: ROUTES.ADMIN_MARKETING,
    icon: Megaphone,
    labelKey: "nav.marketing",
  },
  {
    href: ROUTES.ADMIN_COUPONS,
    icon: Tag,
    labelKey: "nav.coupons",
  },
  {
    href: ROUTES.ADMIN_CONTENT,
    icon: BookOpen,
    labelKey: "nav.content",
  },
]

const SYSTEM_NAV: readonly NavItem[] = [
  {
    href: ROUTES.ADMIN_AUDIT,
    icon: ScrollText,
    labelKey: "nav.audit",
  },
  {
    disabled: true,
    href: ROUTES.ADMIN_SETTINGS,
    icon: Settings,
    labelKey: "nav.settings",
  },
]

"";

import { type JSX, type MouseEvent, useCallback, useMemo } from "react";

import { useLocation, useRouter } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronRight,
  FolderOpen,
  Gift,
  Layers,
  LayoutDashboard,
  Megaphone,
  Package,
  ScrollText,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Users,
  LogOut
} from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { signOut } from "~/src/integrations/better-auth/auth.client";

import { cn } from "~/src/lib/utils";

import { Avatar, AvatarFallback } from "~/src/components/shadcn/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/src/components/shadcn/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "~/src/components/shadcn/dropdown-menu";
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
  SidebarSeparator
} from "~/src/components/shadcn/sidebar";

import { LocalizedLink, type LocalizedTo } from "~/src/components/custom/localized-link";

import { Route as AdminRoute } from "~/src/routes/{-$locale}.admin";

interface NavItem {
  readonly href: LocalizedTo;
  readonly icon: typeof LayoutDashboard;
  readonly labelKey: string;
}

const SIMPLE_NAV: readonly NavItem[] = [
  { href: CONSTANTS.ROUTES.ADMIN, icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { href: CONSTANTS.ROUTES.ADMIN_ORDERS, icon: ShoppingCart, labelKey: "nav.orders" },
  { href: CONSTANTS.ROUTES.ADMIN_CUSTOMERS, icon: Users, labelKey: "nav.customers" }
];

const SIMPLE_NAV_ITEMS = SIMPLE_NAV.filter((item) => item.href !== CONSTANTS.ROUTES.ADMIN);

const CATALOG_SUB: readonly NavItem[] = [
  { href: CONSTANTS.ROUTES.ADMIN_PRODUCTS, icon: ShoppingBag, labelKey: "nav.products" },
  { href: CONSTANTS.ROUTES.ADMIN_CATEGORIES, icon: FolderOpen, labelKey: "nav.categories" },
  { href: CONSTANTS.ROUTES.ADMIN_COLLECTIONS, icon: Layers, labelKey: "nav.collections" }
];

const TOOLS_NAV: readonly NavItem[] = [
  { href: CONSTANTS.ROUTES.ADMIN_MARKETING, icon: Megaphone, labelKey: "nav.marketing" },
  { href: CONSTANTS.ROUTES.ADMIN_COUPONS, icon: Tag, labelKey: "nav.coupons" },
  { href: CONSTANTS.ROUTES.ADMIN_CONTENT, icon: BookOpen, labelKey: "nav.content" }
];

const SYSTEM_NAV: readonly NavItem[] = [
  { href: CONSTANTS.ROUTES.ADMIN_AUDIT, icon: ScrollText, labelKey: "nav.audit" },
  { href: CONSTANTS.ROUTES.ADMIN_SETTINGS, icon: Settings, labelKey: "nav.settings" }
];

function matchRoute(pathname: string, href: string): boolean {
  if (href === CONSTANTS.ROUTES.ADMIN) {
    return pathname.endsWith(CONSTANTS.ROUTES.ADMIN);
  }

  if (href === CONSTANTS.ROUTES.ADMIN_CATALOG) {
    return pathname.endsWith(CONSTANTS.ROUTES.ADMIN_CATALOG) || pathname.includes(`${CONSTANTS.ROUTES.ADMIN_CATALOG}/new`);
  }

  return pathname.includes(href);
}

export function AdminSidebar(): JSX.Element {
  const router = useRouter();

  const { pathname } = useLocation();
  const isCatalogRoute = pathname.includes(CONSTANTS.ROUTES.ADMIN_CATALOG);

  const handleCatalogClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (!isCatalogRoute) {
        e.preventDefault();
        void router.navigate({
          to: `/{-$locale}${CONSTANTS.ROUTES.ADMIN_PRODUCTS}`
        });
      }
    },
    [isCatalogRoute, router]
  );

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
  );
}

function AdminSidebarHeader(): JSX.Element {
  return (
    <SidebarHeader className="flex h-16 justify-center border-b border-sidebar-border p-2">
      <SidebarMenu>
        <AdminSidebarHeaderBrand />
      </SidebarMenu>
    </SidebarHeader>
  );
}

function AdminSidebarHeaderBrand(): JSX.Element {
  const t = useTranslations("admin");
  const homeLink = useMemo(() => <LocalizedLink to={CONSTANTS.ROUTES.HOME} />, []);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" render={homeLink} className="hover:bg-transparent active:bg-transparent">
        <div data-sidebar-icon className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground">
          <Gift className="size-5 text-background" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold tracking-tight">{t("brand")}</p>
          <p className="truncate text-[10px] leading-none text-sidebar-foreground/50">{t("subtitle")}</p>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AdminSidebarContent({
  pathname,
  isCatalogRoute,
  handleCatalogClick
}: {
  readonly pathname: string;
  readonly isCatalogRoute: boolean;
  readonly handleCatalogClick: (e: MouseEvent<HTMLButtonElement>) => void;
}): JSX.Element {
  const t = useTranslations("admin");

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
  );
}

function AdminSidebarMainGroup({
  pathname,
  isCatalogRoute,
  handleCatalogClick
}: {
  readonly pathname: string;
  readonly isCatalogRoute: boolean;
  readonly handleCatalogClick: (e: MouseEvent<HTMLButtonElement>) => void;
}): JSX.Element {
  const t = useTranslations("admin");
  const adminLink = useMemo(() => <LocalizedLink to={CONSTANTS.ROUTES.ADMIN} />, []);
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
    [isCatalogRoute, t, handleCatalogClick]
  );

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={matchRoute(pathname, CONSTANTS.ROUTES.ADMIN)}
          tooltip={t("nav.dashboard")}
          size="default"
          render={adminLink}
          className={cn(matchRoute(pathname, CONSTANTS.ROUTES.ADMIN) && "bg-sidebar-accent font-medium")}
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
  );
}

function AdminSidebarFooter(_props: Record<string, never>): JSX.Element {
  const t = useTranslations("admin");

  const handleSignOut = useCallback(async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          globalThis.location.href = CONSTANTS.ROUTES.AUTH_SIGN_IN;
        }
      }
    });
  }, []);

  const onSignOutClick = useCallback(() => {
    void handleSignOut();
  }, [handleSignOut]);

  const trigger = useMemo(
    () => (
      <SidebarMenuButton
        size="lg"
        tooltip={t("user.name")}
        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      >
        <AdminSidebarUser />
      </SidebarMenuButton>
    ),
    [t]
  );

  return (
    <SidebarFooter className="pb-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger render={trigger} />
            <DropdownMenuContent
              side="top"
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="end"
              sideOffset={4}
            >
              <AdminSidebarUserDropdown isDropdown />
              <DropdownMenuSeparator />
              <AdminSidebarSignOutItem onSignOutClick={onSignOutClick} />
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

function AdminSidebarSignOutItem({ onSignOutClick }: { readonly onSignOutClick: () => void }): JSX.Element {
  const t = useTranslations("admin");
  return (
    <DropdownMenuItem onClick={onSignOutClick} className="cursor-pointer">
      <LogOut className="mr-2 size-4" />
      {t("user.signOut")}
    </DropdownMenuItem>
  );
}

function AdminSidebarUserDropdown({ isDropdown }: { readonly isDropdown: boolean }): JSX.Element {
  return (
    <DropdownMenuLabel className="p-0 font-normal">
      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
        <AdminSidebarUser isDropdown={isDropdown} />
      </div>
    </DropdownMenuLabel>
  );
}

const INITIALS_START = 0;
const INITIALS_END = 2;

function AdminSidebarUser({ isDropdown = false }: { readonly isDropdown?: boolean }): JSX.Element {
  const { user } = AdminRoute.useRouteContext();
  const initials = user.name.slice(INITIALS_START, INITIALS_END).toUpperCase();

  return (
    <>
      <Avatar size="sm" className="rounded-md after:rounded-md">
        <AvatarFallback className="rounded-md bg-sidebar-accent text-[10px] font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[12px] leading-none font-medium">{user.name}</p>
        <p className="mt-0.5 truncate text-[10px] leading-none text-sidebar-foreground/50">{user.email}</p>
      </div>
      {!isDropdown && (
        <div className="shrink-0">
          <ChevronRight className="size-3.5 text-sidebar-foreground/30" strokeWidth={1.5} />
        </div>
      )}
    </>
  );
}

function AdminSidebarCatalogSubItem({ sub, pathname }: { readonly sub: NavItem; readonly pathname: string }): JSX.Element {
  const t = useTranslations("admin");
  const subActive = matchRoute(pathname, sub.href);
  const link = useMemo(() => <LocalizedLink to={sub.href} />, [sub.href]);

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton isActive={subActive} render={link}>
        <sub.icon className="size-3.5" strokeWidth={1.5} />
        <span>{t(sub.labelKey)}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function AdminSidebarCatalogSubMenu({ pathname }: { readonly pathname: string }): JSX.Element {
  return (
    <SidebarMenuSub>
      {CATALOG_SUB.map((sub) => (
        <AdminSidebarCatalogSubItem key={sub.href} sub={sub} pathname={pathname} />
      ))}
    </SidebarMenuSub>
  );
}

function AdminSidebarNavItem({ item, pathname }: { readonly item: NavItem; readonly pathname: string }): JSX.Element {
  const t = useTranslations("admin");
  const active = matchRoute(pathname, item.href);
  const link = useMemo(() => <LocalizedLink to={item.href} />, [item.href]);

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
  );
}

function AdminSidebarNavItems({ items, pathname }: { readonly items: readonly NavItem[]; readonly pathname: string }): JSX.Element {
  return (
    <>
      {items.map((item) => (
        <AdminSidebarNavItem key={item.href} item={item} pathname={pathname} />
      ))}
    </>
  );
}

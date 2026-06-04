import { type JSX, useCallback, useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";
import { Separator } from "~/src/components/shadcn/separator";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import { ORDERS } from "~/src/data/account-orders-data";

export const Route = createFileRoute("/{-$locale}/account/orders/")({
  component: OrdersPage
});

const FILTER_OPTIONS = ["all", "delivered", "shipped", "processing", "cancelled"] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

const ZERO_ORDERS = 0;
const START_INDEX = 0;
const MAX_VISIBLE_IMAGES = 3;
const OVERLAP_STYLE = { marginLeft: "-0.5rem" };

function OrdersPage(): JSX.Element {
  const t = useTranslations("pages.account.orders");
  const [filter, setFilter] = useState<FilterOption>("all");

  const filteredOrders = useMemo(() => (filter === "all" ? ORDERS : ORDERS.filter((o) => o.status === filter)), [filter]);

  return (
    <div>
      <div className="sticky top-20 z-10 -mx-6 bg-background px-6 pt-6 sm:-mx-12 sm:px-12 lg:mx-0 lg:px-0 lg:pt-0">
        <div className="mb-10 space-y-3">
          <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {FILTER_OPTIONS.map((opt) => (
            <FilterButton key={opt} opt={opt} currentFilter={filter} setFilter={setFilter} />
          ))}
        </div>
        <Separator className="mt-4 mb-0" />
      </div>

      <div className="pt-4">
        {filteredOrders.length === ZERO_ORDERS ? (
          <div className="py-20 text-center">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-border pb-10">
            {filteredOrders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({
  currentFilter,
  opt,
  setFilter
}: Readonly<{
  currentFilter: FilterOption;
  opt: FilterOption;
  setFilter: (f: FilterOption) => void;
}>): JSX.Element {
  const t = useTranslations("pages.account.orders");
  const isActive = currentFilter === opt;
  const onClick = useCallback(() => {
    setFilter(opt);
  }, [opt, setFilter]);

  return (
    <Button
      variant="account-ghost"
      onClick={onClick}
      className={`tracking-[0.18em] ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {t(`filter.${opt}`)}
    </Button>
  );
}

interface OrderRowProps {
  readonly order: (typeof ORDERS)[number];
}

function OrderRow({ order }: OrderRowProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = useCallback(() => {
    setExpanded((e) => !e);
  }, []);

  return (
    <div>
      <OrderRowHeader order={order} expanded={expanded} toggleExpanded={toggleExpanded} />
      <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <OrderRowDetails order={order} />
        </div>
      </div>
    </div>
  );
}

function OrderRowHeader({
  expanded,
  order,
  toggleExpanded
}: Readonly<{
  expanded: boolean;
  order: (typeof ORDERS)[number];
  toggleExpanded: () => void;
}>): JSX.Element {
  const t = useTranslations("pages.account.orders");

  return (
    <button
      type="button"
      onClick={toggleExpanded}
      className="group flex w-full cursor-pointer items-center gap-5 py-5 text-left transition-colors"
    >
      <div className="flex items-center gap-3">
        {order.items.slice(START_INDEX, MAX_VISIBLE_IMAGES).map((item, i) => (
          <div
            key={item.name}
            className="relative size-14 shrink-0 overflow-hidden bg-muted"
            style={i > START_INDEX ? OVERLAP_STYLE : undefined}
          >
            <Image src={item.image} alt={item.name} width={56} height={56} className="absolute inset-0 size-full object-cover" />
          </div>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] tracking-[0.02em]">{order.id}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{order.date}</p>
      </div>

      <div className="hidden text-right sm:block">
        <p className="text-[13px] tracking-[0.02em] tabular-nums">{order.total}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground capitalize">{t(`status.${order.status}`)}</p>
      </div>

      <ChevronDown
        className={`size-4 shrink-0 text-muted-foreground/50 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
        strokeWidth={1.5}
      />
    </button>
  );
}

function OrderRowDetails({ order }: OrderRowProps): JSX.Element {
  const t = useTranslations("pages.account.orders");

  const orderParams = useMemo(() => ({ id: order.id }), [order.id]);

  return (
    <div className="pb-6 pl-0 sm:pl-19">
      <div className="divide-y divide-border/50">
        {order.items.map((item) => (
          <OrderRowItem key={item.name} item={item} />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <LocalizedLink
          to={CONSTANTS.ROUTES.ACCOUNT_ORDER}
          params={orderParams}
          className="text-[11px] tracking-[0.15em] text-foreground uppercase transition-colors hover:text-muted-foreground"
        >
          {t("viewDetails")}
        </LocalizedLink>
        <span className="text-muted-foreground/30">·</span>
        <Button variant="account-ghost">{t("trackOrder")}</Button>
        {order.status === "delivered" ? (
          <>
            <span className="text-muted-foreground/30">·</span>
            <Button variant="account-ghost">{t("returnItems")}</Button>
          </>
        ) : undefined}
      </div>
    </div>
  );
}

function OrderRowItem({
  item
}: Readonly<{
  item: (typeof ORDERS)[number]["items"][number];
}>): JSX.Element {
  const t = useTranslations("pages.account.orders");

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="relative size-12 shrink-0 overflow-hidden bg-muted">
        <Image src={item.image} alt={item.name} width={48} height={48} className="absolute inset-0 size-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px]">{item.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {t("qty")}
          {": "}
          {item.qty}
        </p>
      </div>
      <p className="text-[13px] tabular-nums">{item.price}</p>
    </div>
  );
}

import { type JSX, useCallback } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Copy, Truck } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";
import { Separator } from "~/src/components/shadcn/separator";

import { Image } from "~/src/components/custom/image";

import { DEMO_ORDER_ID, ORDER_DETAIL } from "~/src/data/account-orders-data";

export const Route = createFileRoute("/{-$locale}/account/orders/$id")({
  component: OrderDetailPage
});

function OrderDetailPage(): JSX.Element {
  const t = useTranslations("account.orderDetail");
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    void navigate({ to: `/{-$locale}${CONSTANTS.ROUTES.ACCOUNT_ORDERS}` });
  }, [navigate]);

  const orderId = id === DEMO_ORDER_ID ? DEMO_ORDER_ID : id;
  const order = ORDER_DETAIL;

  return (
    <div>
      <Button variant="account-ghost" onClick={handleBack} className="mb-8 flex items-center gap-2">
        <ArrowLeft className="size-3.5" strokeWidth={1.5} />
        {t("backToOrders")}
      </Button>

      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-3xl leading-[0.94] tracking-tight lg:text-4xl">{orderId}</h1>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
          <span>{order.date}</span>
          <span className="text-border">·</span>
          <span className="capitalize">{t(`status.${order.status}`)}</span>
        </div>
      </div>

      <div className="mb-10 flex items-center gap-4 bg-muted/50 px-5 py-4">
        <Truck className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.2} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px]">{t("deliveredOn", { date: order.deliveredDate })}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-[11px] text-muted-foreground tabular-nums">{order.trackingNumber}</p>
            <Button variant="ghost" size="icon-xs">
              <Copy className="size-3" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("items")}</h2>
        <Separator className="mt-3 mb-0" />
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <OrderItem key={item.name} item={item} />
          ))}
        </div>
      </section>

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">{t("subtotal")}</span>
          <span className="tabular-nums">{order.subtotal}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">{t("shipping")}</span>
          <span className="tabular-nums">{order.shipping === "€ 0.00" ? t("free") : order.shipping}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">{t("tax")}</span>
          <span className="tabular-nums">{order.tax}</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between text-[14px]">
          <span>{t("total")}</span>
          <span className="tabular-nums">{order.total}</span>
        </div>
      </div>

      <Separator className="my-10" />

      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        <ShippingAddressBlock order={order} />
        <PaymentInfoBlock order={order} />
        <TimelineBlock order={order} />
      </div>

      <Separator className="my-10" />

      <div className="flex flex-wrap gap-4">
        <Button variant="account-ghost">{t("returnItems")}</Button>
        <span className="text-muted-foreground/30">·</span>
        <Button variant="account-ghost">{t("downloadInvoice")}</Button>
        <span className="text-muted-foreground/30">·</span>
        <Button variant="account-ghost">{t("needHelp")}</Button>
      </div>
    </div>
  );
}

function OrderItem({
  item
}: Readonly<{
  item: (typeof ORDER_DETAIL)["items"][number];
}>): JSX.Element {
  const t = useTranslations("account.orderDetail");

  return (
    <div className="flex items-center gap-5 py-5">
      <div className="relative size-20 shrink-0 overflow-hidden bg-muted">
        <Image src={item.image} alt={item.name} width={80} height={80} className="absolute inset-0 size-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] tracking-[0.01em]">{item.name}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">{item.variant}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t("qty")}
          {": "}
          {item.qty}
        </p>
      </div>
      <p className="text-[14px] tabular-nums">{item.price}</p>
    </div>
  );
}

function ShippingAddressBlock({ order }: Readonly<{ order: typeof ORDER_DETAIL }>): JSX.Element {
  const t = useTranslations("account.orderDetail");
  return (
    <div>
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("shippingAddress")}</h3>
      <Separator className="mt-3 mb-4" />
      <div className="space-y-1 text-[13px] leading-relaxed">
        <p>{order.shippingAddress.name}</p>
        <p className="text-muted-foreground">{order.shippingAddress.line1}</p>
        <p className="text-muted-foreground">
          {order.shippingAddress.postal} {order.shippingAddress.city}
        </p>
        <p className="text-muted-foreground">{order.shippingAddress.country}</p>
      </div>
    </div>
  );
}

function PaymentInfoBlock({ order }: Readonly<{ order: typeof ORDER_DETAIL }>): JSX.Element {
  const t = useTranslations("account.orderDetail");
  return (
    <div>
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("paymentInfo")}</h3>
      <Separator className="mt-3 mb-4" />
      <div className="space-y-1 text-[13px] leading-relaxed">
        <p>{order.paymentMethod}</p>
        <p className="text-muted-foreground">{order.billingAddress.line1}</p>
        <p className="text-muted-foreground">
          {order.billingAddress.postal} {order.billingAddress.city}
        </p>
      </div>
    </div>
  );
}

const FIRST_INDEX = 0;
const LAST_OFFSET = 1;

function TimelineBlock({ order }: Readonly<{ order: typeof ORDER_DETAIL }>): JSX.Element {
  const t = useTranslations("account.orderDetail");
  return (
    <div>
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("timeline")}</h3>
      <Separator className="mt-3 mb-4" />
      <div className="space-y-3">
        {order.timeline.map((entry, i) => (
          <div key={`${entry.date}-${entry.event}`} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`mt-1 size-1.5 rounded-full ${i === FIRST_INDEX ? "bg-foreground" : "bg-muted-foreground/30"}`} />
              {i < order.timeline.length - LAST_OFFSET ? <div className="mt-1 h-4 w-px bg-border" /> : undefined}
            </div>
            <div className="min-w-0">
              <p className="text-[12px]">{t(`events.${entry.event}`)}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">{entry.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

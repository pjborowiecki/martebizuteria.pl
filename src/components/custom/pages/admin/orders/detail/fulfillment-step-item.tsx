import type { JSX } from "react";

import { Check } from "lucide-react";
import { useTranslations } from "use-intl";

import type { FulfillmentStep } from "~/src/data/order-detail-data";

const FIRST_STEP_INDEX = 0;

interface FulfillmentStepItemProps {
  readonly index: number;
  readonly step: FulfillmentStep;
}

export function FulfillmentStepItem({ index, step }: FulfillmentStepItemProps): JSX.Element {
  const t = useTranslations("admin");

  return (
    <div className="flex flex-1 flex-col items-center text-center">
      <div className="relative flex w-full items-center justify-center">
        {index > FIRST_STEP_INDEX && <div className={`absolute right-1/2 h-0.5 w-full ${step.done ? "bg-foreground" : "bg-border"}`} />}
        <div
          className={`relative z-10 flex size-7 items-center justify-center rounded-full border-2 ${
            step.done ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground/30"
          }`}
        >
          {step.done ? <Check className="size-3.5" strokeWidth={2.5} /> : <span className="size-2 rounded-full bg-current" />}
        </div>
      </div>
      <p className={`mt-2 text-[12px] ${step.done ? "font-medium text-foreground" : "text-muted-foreground/50"}`}>
        {t(`orderDetail.fulfillment.steps.${step.key}`)}
      </p>
      {step.date !== undefined && <p className="text-[10px] text-muted-foreground/40">{step.date}</p>}
    </div>
  );
}

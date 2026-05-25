"use client";

import { type JSX, lazy, Suspense, useCallback, useMemo } from "react";

import { Pencil } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Skeleton } from "~/src/components/shadcn/skeleton";

import { useCheckoutForm } from "~/src/components/custom/checkout/components/checkout-form-provider";
import type { CheckoutStepConfig } from "~/src/components/custom/checkout/lib/checkout-steps";

const STEP_NUMBER_OFFSET = 1;
const PAD_LENGTH = 2;
const PAD_CHAR = "0";

function StepSkeleton(): JSX.Element {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-full rounded-none" />
      <Skeleton className="h-10 w-full rounded-none" />
      <Skeleton className="h-10 w-2/3 rounded-none" />
    </div>
  );
}

const stepSkeletonElement = <StepSkeleton />;

export function CheckoutStep({ stepConfig, stepIndex }: Readonly<{ stepConfig: CheckoutStepConfig; stepIndex: number }>): JSX.Element {
  const t = useTranslations("checkoutPage.checkoutForm");
  const { activeStepIndex, onEdit } = useCheckoutForm();

  const isActive = activeStepIndex === stepIndex;
  const isCompleted = activeStepIndex > stepIndex;
  const stepNumber = String(stepIndex + STEP_NUMBER_OFFSET).padStart(PAD_LENGTH, PAD_CHAR);

  const StepComponent = useMemo(() => lazy(stepConfig.component), [stepConfig.component]);

  const handleClick = useCallback(() => {
    if (isCompleted) {
      onEdit(stepConfig.id);
    }
  }, [isCompleted, onEdit, stepConfig.id]);

  return (
    <div
      className={cn(
        "border border-border/30 bg-muted/15 transition-all duration-300",
        isActive && "border-border/50 bg-muted/25",
        !isActive && !isCompleted && "border-border/15 bg-muted/10"
      )}
    >
      {/* Step header */}
      <button
        type="button"
        onClick={isCompleted ? handleClick : undefined}
        className={cn(
          "flex w-full cursor-default items-center gap-4 px-6 py-5 text-left transition-colors",
          isCompleted && "cursor-pointer hover:bg-muted/30"
        )}
      >
        <span
          className={cn(
            "shrink-0 text-sm font-light tabular-nums transition-colors",
            isActive ? "text-foreground" : "text-muted-foreground/50"
          )}
        >
          {stepNumber}
        </span>
        <span
          className={cn(
            "flex-1 text-[13px] font-medium tracking-[0.18em] uppercase transition-colors",
            isActive ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {t(stepConfig.titleKey)}
        </span>
        {isCompleted ? <Pencil className="size-3.5 text-muted-foreground/60" strokeWidth={1.5} /> : undefined}
      </button>

      {/* Step content — animated expand/collapse */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
          isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-6 pt-2 pb-8">
            <Suspense fallback={stepSkeletonElement}>
              <StepComponent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

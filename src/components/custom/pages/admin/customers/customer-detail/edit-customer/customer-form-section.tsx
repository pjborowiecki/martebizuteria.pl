import type { JSX, ReactNode } from "react";

import type { LucideIcon } from "lucide-react";

interface CustomerFormSectionProps {
  readonly children: ReactNode;
  readonly description?: string;
  readonly icon: LucideIcon;
  readonly title: string;
}

/** Flat section grouping inside the customer sheet — matches category/collection sheets. */
export function CustomerFormSection({ children, description, icon: Icon, title }: Readonly<CustomerFormSectionProps>): JSX.Element {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Icon aria-hidden className="size-4 shrink-0 text-foreground" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        </div>
        {description !== undefined && <p className="pl-6 text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4 pl-6">{children}</div>
    </section>
  );
}

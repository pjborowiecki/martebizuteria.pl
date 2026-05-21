import type { JSX, SyntheticEvent } from "react";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Checkbox } from "~/src/components/shadcn/checkbox";
import { Input } from "~/src/components/shadcn/input";
import { Label } from "~/src/components/shadcn/label";

interface SignUpWithPasswordFormProps {
  readonly submitText: string;
  readonly termsText?: string;
}

const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
  e.preventDefault();
};

export function SignUpWithPasswordForm({ submitText, termsText }: Readonly<SignUpWithPasswordFormProps>): JSX.Element {
  const t = useTranslations("components.custom.authForm");

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            {t("firstName")}
          </Label>
          <Input id="firstName" name="firstName" autoComplete="given-name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            {t("lastName")}
          </Label>
          <Input id="lastName" name="lastName" autoComplete="family-name" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          {t("email")}
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          {t("password")}
        </Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>

      {termsText !== undefined && (
        <label className="flex items-start gap-3 pt-1">
          <Checkbox name="terms" required className="mt-0.5" />
          <span className="text-xs leading-relaxed text-muted-foreground">{termsText}</span>
        </label>
      )}

      <Button type="submit" size="xl" className="w-full gap-2.5 tracking-wide">
        {submitText}
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

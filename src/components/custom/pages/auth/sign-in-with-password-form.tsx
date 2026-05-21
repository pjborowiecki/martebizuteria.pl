import type { JSX, SyntheticEvent } from "react";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Input } from "~/src/components/shadcn/input";
import { Label } from "~/src/components/shadcn/label";

interface SignInWithPasswordFormProps {
  readonly submitText: string;
  readonly forgotPasswordText?: string;
}

const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
  e.preventDefault();
};

export function SignInWithPasswordForm({ submitText, forgotPasswordText }: Readonly<SignInWithPasswordFormProps>): JSX.Element {
  const t = useTranslations("components.custom.authForm");

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          {t("email")}
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password" className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            {t("password")}
          </Label>
          {forgotPasswordText !== undefined && (
            <button
              type="button"
              className="text-[11px] text-muted-foreground/70 underline underline-offset-4 transition-colors hover:text-foreground"
            >
              {forgotPasswordText}
            </button>
          )}
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      <Button type="submit" size="xl" className="w-full gap-2.5 tracking-wide">
        {submitText}
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

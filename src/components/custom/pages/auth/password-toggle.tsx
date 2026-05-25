import type { JSX } from "react";

import { Eye, EyeOff } from "lucide-react";

import { InputGroupButton } from "~/src/components/shadcn/input-group";

interface PasswordToggleProps {
  readonly onToggle: () => void;
  readonly show: boolean;
}

export function PasswordToggle({ onToggle, show }: Readonly<PasswordToggleProps>): JSX.Element {
  return (
    <InputGroupButton
      size="icon-sm"
      variant="ghost"
      onClick={onToggle}
      aria-label={show ? "Hide password" : "Show password"}
      className="text-muted-foreground hover:text-foreground"
    >
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </InputGroupButton>
  );
}

import { type JSX } from "react"

import { Eye, EyeOff } from "lucide-react"

import { InputGroupButton } from "~/src/presentation/components/shadcn/input-group"

export const PasswordToggle = ({ onToggle, show }: Readonly<PasswordToggleProps>): JSX.Element => (
  <InputGroupButton
    size="icon-sm"
    variant="ghost"
    onClick={onToggle}
    aria-label={show ? "Hide password" : "Show password"}
    className="text-muted-foreground hover:text-foreground pointer-coarse:-mx-1.5 pointer-coarse:-mt-2 pointer-coarse:-mb-3 pointer-coarse:size-10"
  >
    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
  </InputGroupButton>
)

interface PasswordToggleProps {
  readonly onToggle: () => void
  readonly show: boolean
}

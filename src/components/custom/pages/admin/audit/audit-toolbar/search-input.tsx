import { type ChangeEvent, type JSX, useCallback } from "react";

import { Search } from "lucide-react";
import { useTranslations } from "use-intl";

interface SearchInputProps {
  readonly onChange: (value: string) => void;
  readonly value: string;
}

export function SearchInput({ onChange, value }: SearchInputProps): JSX.Element {
  const t = useTranslations("admin");

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/40"
        strokeWidth={1.5}
      />
      <input
        aria-label={t("audit.searchPlaceholder")}
        className="h-7 w-48 rounded-md border border-border/50 bg-background pr-3 pl-8 text-xs transition-colors placeholder:text-muted-foreground/40 focus:border-border focus:outline-none"
        onChange={handleChange}
        placeholder={t("audit.searchPlaceholder")}
        type="text"
        value={value}
      />
    </div>
  );
}

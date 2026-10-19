import { type JSX, useCallback, useMemo } from "react"

import {
  $createDirectiveNode,
  ButtonOrDropdownButton,
  type DirectiveDescriptor,
  type DirectiveEditorProps,
  directivesPlugin,
  insertDecoratorNode$,
  usePublisher,
} from "@mdxeditor/editor"
import { cn } from "cn"
import { Store } from "lucide-react"
import { useTranslations } from "use-intl/react"

import {
  SELLER_PLACEHOLDERS,
  SELLER_PLACEHOLDER_DIRECTIVE,
  type SellerPlaceholder,
} from "~/src/modules/content-page/content-page.constants"
import { readSellerPlaceholder } from "~/src/modules/content-page/content-page.utils"

const SellerDetailChip = ({ mdastNode }: Readonly<DirectiveEditorProps>): JSX.Element => {
  const t = useTranslations("pages.admin.content.editor.sellerDetails")
  const placeholder = readSellerPlaceholder(mdastNode)

  return (
    <span
      className={cn(
        "mx-px inline-flex items-center rounded border px-1.5 align-baseline text-[0.85em] leading-snug font-medium whitespace-nowrap select-none",
        placeholder === undefined ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted text-foreground",
      )}
      contentEditable={false}
      data-seller-detail={placeholder}
    >
      {placeholder === undefined ? t("unknown") : t(`fields.${placeholder}`)}
    </span>
  )
}

const SELLER_DETAIL_DIRECTIVE: DirectiveDescriptor = {
  Editor: SellerDetailChip,
  attributes: [],
  hasChildren: false,
  name: SELLER_PLACEHOLDER_DIRECTIVE,
  testNode: (node) => node.type === "textDirective" && node.name === SELLER_PLACEHOLDER_DIRECTIVE,
  type: "textDirective",
}

export const sellerDetailDirectivesPlugin = directivesPlugin({
  directiveDescriptors: [SELLER_DETAIL_DIRECTIVE],
  escapeUnknownTextDirectives: true,
})

export const InsertSellerDetail = (): JSX.Element => {
  const t = useTranslations("pages.admin.content.editor.sellerDetails")
  const insertDecoratorNode = usePublisher(insertDecoratorNode$)
  const items = useMemo(() => SELLER_PLACEHOLDERS.map((value) => ({ label: t(`fields.${value}`), value })), [t])

  const insert = useCallback(
    (placeholder: SellerPlaceholder) => {
      insertDecoratorNode(() =>
        $createDirectiveNode({
          children: [{ type: "text", value: placeholder }],
          name: SELLER_PLACEHOLDER_DIRECTIVE,
          type: "textDirective",
        }),
      )
    },
    [insertDecoratorNode],
  )

  return (
    <ButtonOrDropdownButton items={items} onChoose={insert} title={t("insert")}>
      <Store aria-hidden className="size-5" strokeWidth={1.5} />
    </ButtonOrDropdownButton>
  )
}

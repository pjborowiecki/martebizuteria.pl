import { type Nodes, type Parent, type PhrasingContent, type Root, type RootContent } from "mdast"
import { type VFile } from "vfile"

import {
  type Directive,
  type SellerPlaceholder,
  formatSellerPlaceholder,
  readSellerPlaceholder,
} from "~/src/modules/content-page/content-page.seller-placeholders"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"
import { toSellerPhoneHref } from "~/src/modules/store-setting/store-setting.utils"

const SELLER_LINK_TARGETS: Partial<Record<SellerPlaceholder, (seller: StoreSetting["sellerDetails"]) => string>> = {
  emailLink: ({ email }) => `mailto:${email}`,
  phoneLink: ({ phone }) => toSellerPhoneHref(phone),
}

const isDirective = (node: Nodes): node is Directive =>
  node.type === "containerDirective" || node.type === "leafDirective" || node.type === "textDirective"

const sellerDetail = (placeholder: SellerPlaceholder, { locale, seller }: Readonly<SellerDetailsOptions>): PhrasingContent => {
  const value = formatSellerPlaceholder(placeholder, seller, locale)
  const url = SELLER_LINK_TARGETS[placeholder]?.(seller)

  return url === undefined ? { type: "text", value } : { children: [{ type: "text", value }], type: "link", url }
}

const asWritten = (directive: Directive, file: VFile): RootContent => {
  const value = file.toString().slice(directive.position?.start.offset, directive.position?.end.offset)

  return directive.type === "textDirective" ? { type: "text", value } : { children: [{ type: "text", value }], type: "paragraph" }
}

const replaceDirectives = (parent: Parent, replace: (directive: Directive) => RootContent): void => {
  parent.children = parent.children.map((child) => {
    if (isDirective(child)) {
      return replace(child)
    }
    if ("children" in child) {
      replaceDirectives(child, replace)
    }

    return child
  })
}

export const remarkSellerDetails =
  (options: Readonly<SellerDetailsOptions>) =>
  (tree: Root, file: VFile): void => {
    replaceDirectives(tree, (directive) => {
      const placeholder = readSellerPlaceholder(directive)

      return placeholder === undefined ? asWritten(directive, file) : sellerDetail(placeholder, options)
    })
  }

interface SellerDetailsOptions {
  readonly locale: string
  readonly seller: StoreSetting["sellerDetails"]
}

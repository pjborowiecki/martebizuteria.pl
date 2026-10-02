import {
  addExportVisitor$,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  realmPlugin,
  thematicBreakPlugin,
} from "@mdxeditor/editor"
import { $isLineBreakNode, type LexicalNode } from "lexical"

import { CONTENT_PAGE_LINK_PATTERN } from "~/src/modules/content-page/content-page.constants"

const SECTION_HEADING_LEVEL = 2

const SUBSECTION_HEADING_LEVEL = 3

const OVERRIDING_VISITOR_PRIORITY = 100

const separatesParagraphs = (node: LexicalNode): boolean =>
  $isLineBreakNode(node.getNextSibling()) || $isLineBreakNode(node.getPreviousSibling())

const hardBreakPlugin = realmPlugin({
  init(realm) {
    realm.pub(addExportVisitor$, {
      priority: OVERRIDING_VISITOR_PRIORITY,
      testLexicalNode: $isLineBreakNode,
      visitLexicalNode: ({ actions, lexicalNode, mdastParent }) => {
        actions.appendToParent(mdastParent, separatesParagraphs(lexicalNode) ? { type: "text", value: "\n" } : { type: "break" })
      },
    })
  },
})

export const CONTENT_EDITOR_PLUGINS = [
  headingsPlugin({ allowedHeadingLevels: [SECTION_HEADING_LEVEL, SUBSECTION_HEADING_LEVEL] }),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  linkPlugin({ validateUrl: (url) => CONTENT_PAGE_LINK_PATTERN.test(url) }),
  linkDialogPlugin({ showLinkTitleField: false }),
  markdownShortcutPlugin(),
  hardBreakPlugin(),
]

export const CONTENT_EDITOR_MARKDOWN_OPTIONS = { bullet: "-" } as const

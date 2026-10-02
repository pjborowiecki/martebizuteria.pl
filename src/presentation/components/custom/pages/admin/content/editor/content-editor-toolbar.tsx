import { type JSX } from "react"

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertThematicBreak,
  ListsToggle,
  Separator,
  UndoRedo,
} from "@mdxeditor/editor"

const INLINE_FORMATS: ("Bold" | "Italic")[] = ["Bold", "Italic"]

const LIST_TYPES: ("bullet" | "number")[] = ["bullet", "number"]

export const ContentEditorToolbar = (): JSX.Element => (
  <>
    <UndoRedo />
    <Separator />
    <BlockTypeSelect />
    <Separator />
    <BoldItalicUnderlineToggles options={INLINE_FORMATS} />
    <Separator />
    <ListsToggle options={LIST_TYPES} />
    <Separator />
    <CreateLink />
    <InsertThematicBreak />
  </>
)

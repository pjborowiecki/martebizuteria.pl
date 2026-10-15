import { type CDPSession, type Page } from "@playwright/test"

export const previewAutofill = async (page: Page, selectors: readonly string[]): Promise<CDPSession> => {
  const session = await page.context().newCDPSession(page)
  await session.send("DOM.enable")
  await session.send("CSS.enable")
  const { root } = await session.send("DOM.getDocument")
  await Promise.all(
    selectors.map(async (selector) => {
      const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector })
      await session.send("CSS.forcePseudoState", { forcedPseudoClasses: ["autofill"], nodeId })
    }),
  )

  return session
}

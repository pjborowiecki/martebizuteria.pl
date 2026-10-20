export class TestHTMLRewriter {
  static readonly handlers = new Map<string, HTMLRewriterElementContentHandlers>()

  static rewritten: Response | undefined

  on(selector: string, handlers: HTMLRewriterElementContentHandlers): this {
    TestHTMLRewriter.handlers.set(selector, handlers)

    return this
  }

  transform(page: Response): Response {
    return TestHTMLRewriter.rewritten ?? page
  }
}

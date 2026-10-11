import { describe, expect, it } from "vite-plus/test"

import { isNewsletterQueueBatch } from "~/src/modules/newsletter-campaign/newsletter-campaign.utils"

const batchFrom = (queue: string): MessageBatch => ({
  ackAll: () => {},
  messages: [],
  metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
  queue,
  retryAll: () => {},
})

describe("isNewsletterQueueBatch", () => {
  it.each(["martebizuteria-newsletter", "martebizuteria-newsletter-preview", "martebizuteria-newsletter-test"])(
    "recognises a batch from %s",
    (queue) => {
      expect(isNewsletterQueueBatch(batchFrom(queue))).toBe(true)
    },
  )

  it("leaves the audit log queue to its own consumer", () => {
    expect(isNewsletterQueueBatch(batchFrom("martebizuteria-audit-log-test"))).toBe(false)
  })
})

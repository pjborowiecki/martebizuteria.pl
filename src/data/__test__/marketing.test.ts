import { describe, expect, it } from "vite-plus/test"

import { CAMPAIGNS, ENGAGEMENT_DATA, MARKETING_STATS } from "~/src/data/marketing"

describe("ENGAGEMENT_DATA", () => {
  it("covers eight consecutive months without repeats", () => {
    const months = ENGAGEMENT_DATA.map((point) => point.month)

    expect(months).toStrictEqual(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"])
  })

  it("keeps the click rate below the open rate everywhere", () => {
    for (const point of ENGAGEMENT_DATA) {
      expect(point.clickRate).toBeLessThan(point.openRate)
    }
  })
})

describe("CAMPAIGNS", () => {
  it("gives every campaign its own id and name", () => {
    const ids = CAMPAIGNS.map((campaign) => campaign.id)
    const names = CAMPAIGNS.map((campaign) => campaign.name)

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(names).size).toBe(names.length)
  })

  it("uses only known statuses and channels", () => {
    for (const campaign of CAMPAIGNS) {
      expect(["active", "completed", "draft"]).toContain(campaign.status)
      expect(["Email", "SMS", "Social"]).toContain(campaign.type)
    }
  })

  it("leaves a draft campaign without any reported results", () => {
    for (const campaign of CAMPAIGNS.filter((entry) => entry.status === "draft")) {
      expect(campaign.openRate).toBe("—")
      expect(campaign.revenue).toBe("—")
      expect(campaign.sent).toBe("—")
    }
  })

  it("reports an open rate only where the campaign was sent", () => {
    for (const campaign of CAMPAIGNS) {
      if (campaign.openRate !== "—") {
        expect(campaign.sent).not.toBe("—")
      }
    }
  })
})

describe("MARKETING_STATS", () => {
  it("gives every stat its own key", () => {
    const keys = MARKETING_STATS.map((stat) => stat.key)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it("keeps every rising sparkline ending above where it started", () => {
    for (const stat of MARKETING_STATS) {
      const first = stat.spark.at(0)?.v
      const last = stat.spark.at(-1)?.v

      expect(last).toBeGreaterThan(Number(first))
    }
  })

  it("signs the trend to match the up flag", () => {
    for (const stat of MARKETING_STATS) {
      expect(stat.trend.startsWith("-")).toBe(!stat.up)
    }
  })
})

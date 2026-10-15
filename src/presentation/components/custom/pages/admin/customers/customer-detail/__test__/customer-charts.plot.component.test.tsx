import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_MESSAGES } from "~/src/platform/testing/lib/messages"
import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { type User } from "~/src/modules/user/user.types"

import { CustomerCharts } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-charts"

const detail = (overrides: Partial<User["adminCustomerDetail"]> = {}): User["adminCustomerDetail"] => ({
  averageOrderValue: 49_975,
  banExpires: null,
  banReason: null,
  banned: false,
  categoryBreakdown: [],
  createdAt: new Date(2023, 2, 4),
  customTags: [],
  email: "anna@example.com",
  emailVerified: true,
  id: "user-1",
  image: null,
  initials: "AK",
  isAnonymous: false,
  isReturning: false,
  joinDate: "4 Mar 2023",
  metadata: null,
  monthlySpending: [],
  name: "Anna Kowalska",
  orderCount: 4,
  phone: null,
  returningRate: 0,
  role: ROLES.CUSTOMER,
  roleBadgeKey: "roleCustomer",
  stripeCustomerId: null,
  tags: [],
  timeline: [],
  timezone: null,
  totalSpent: 199_900,
  twoFactorEnabled: false,
  updatedAt: new Date(2024, 0, 1),
  ...overrides,
})

const withSpending = () =>
  renderWithProviders(
    <CustomerCharts
      customer={detail({
        monthlySpending: [
          { amount: 0, month: "Jan" },
          { amount: 500_000, month: "Feb" },
          { amount: 1_000_000, month: "Mar" },
        ],
      })}
    />,
  )

const OCTOBER_SPENDING = 39_899

const withOctoberSpending = (): User["adminCustomerDetail"] =>
  detail({
    categoryBreakdown: [{ amount: OCTOBER_SPENDING, category: "Bransoletki" }],
    monthlySpending: [
      { amount: OCTOBER_SPENDING, month: "paź" },
      { amount: 0, month: "lis" },
    ],
  })

const renderInPolish = (customer: User["adminCustomerDetail"]) =>
  render(
    <IntlProvider locale="pl-PL" messages={TEST_MESSAGES} timeZone={I18N.DEFAULT_TIMEZONE}>
      <CustomerCharts customer={customer} />
    </IntlProvider>,
  )

const tickTexts = (container: HTMLElement): string[] =>
  [...container.querySelectorAll(".recharts-cartesian-axis-tick-value")].map((node) => node.textContent)

const chartWrappers = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>("[data-slot='chart']")]

const openTooltip = (chart: HTMLElement): HTMLElement => {
  const surface = chart.querySelector(".recharts-wrapper")
  if (!(surface instanceof HTMLElement)) {
    throw new TypeError("the chart never rendered its wrapper")
  }

  act(() => {
    fireEvent.focus(surface)
  })

  const tooltip = chart.querySelector<HTMLElement>(".recharts-tooltip-wrapper")
  if (tooltip === null) {
    throw new Error("the chart never rendered a tooltip")
  }

  return tooltip
}

const reducedMotionStub = (query: string) => ({
  addEventListener: () => {},
  addListener: () => {},
  dispatchEvent: () => false,
  matches: query === "(prefers-reduced-motion: reduce)",
  media: query,
  onchange: null,
  removeEventListener: () => {},
  removeListener: () => {},
})

beforeEach(() => {
  vi.stubGlobal("matchMedia", reducedMotionStub)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("CustomerCharts spending plot", () => {
  it("draws a month label for every point in the series", () => {
    withSpending()

    expect(screen.getByText("Jan")).toBeInTheDocument()
    expect(screen.getByText("Feb")).toBeInTheDocument()
    expect(screen.getByText("Mar")).toBeInTheDocument()
  })

  it("labels the value axis in compact whole and half thousands of the store currency", () => {
    const { container } = withSpending()

    expect(tickTexts(container)).toStrictEqual(["Jan", "Feb", "Mar", "0", "2.5K", "5K", "7.5K", "10K"])
  })

  it("labels an axis below a thousand in plain major units instead of zero thousands", () => {
    const { container } = renderInPolish(withOctoberSpending())

    expect(tickTexts(container)).toStrictEqual(["paź", "lis", "0", "100", "200", "300", "400"])
  })

  it("fades the area under the curve with its own gradient", () => {
    const { container } = withSpending()

    expect(container.querySelector("#spending-fill")?.tagName).toBe("linearGradient")
    expect(container.querySelectorAll("#spending-fill stop")).toHaveLength(2)
  })

  it("paints the area with that gradient", () => {
    const { container } = withSpending()

    expect(container.querySelector("path.recharts-area-area")?.getAttribute("fill")).toBe("url(#spending-fill)")
  })

  it("draws the line and the gradient in the series colour the chart config defines from the theme", () => {
    const { container } = withSpending()
    const stopColors = [...container.querySelectorAll("#spending-fill stop")].map((stop) => stop.getAttribute("stop-color"))

    expect(container.querySelector("path.recharts-area-curve")?.getAttribute("stroke")).toBe("var(--color-amount)")
    expect(stopColors).toStrictEqual(["var(--color-amount)", "var(--color-amount)"])
    expect(chartWrappers()[0]?.querySelector("style")?.textContent).toContain("--color-amount: var(--foreground);")
  })

  it("draws the grid in the theme border colour", () => {
    const { container } = withSpending()
    const gridStrokes = new Set([...container.querySelectorAll(".recharts-cartesian-grid line")].map((line) => line.getAttribute("stroke")))

    expect(gridStrokes).toStrictEqual(new Set(["var(--color-border)"]))
  })

  it("never wraps the oklch theme tokens in hsl", () => {
    const { container } = renderWithProviders(<CustomerCharts customer={withOctoberSpending()} />)

    expect(container.innerHTML).not.toContain("hsl(")
  })

  it("shows the month's spending as money in the tooltip", () => {
    renderInPolish(withOctoberSpending())
    const [spendingChart] = chartWrappers()
    if (spendingChart === undefined) {
      throw new Error("the spending chart never rendered")
    }

    const tooltip = openTooltip(spendingChart)

    expect(tooltip).toHaveTextContent("paź")
    expect(tooltip).toHaveTextContent("Spending")
    expect(tooltip.textContent).toContain("398,99 zł")
    expect(tooltip.querySelector("[data-slot='chart-tooltip-indicator']")).toHaveStyle({ backgroundColor: "var(--color-amount)" })
  })
})

describe("CustomerCharts category breakdown", () => {
  const breakdown = detail({
    categoryBreakdown: [
      { amount: 23_900, category: "Naszyjniki" },
      { amount: 9900, category: "Bransoletki urodzeniowe z grawerem i zawieszką" },
    ],
  })

  it("names every category with its product value in złoty without needing a hover", () => {
    renderInPolish(breakdown)
    const rows = screen.getAllByRole("listitem").map((row) => [...row.querySelectorAll("span")].map((cell) => cell.textContent))

    expect(rows).toStrictEqual([
      ["Naszyjniki", "239,00\u00A0zł"],
      ["Bransoletki urodzeniowe z grawerem i zawieszką", "99,00\u00A0zł"],
    ])
  })

  it("draws the breakdown without a plot whose cursor or tooltip the card could cut off", () => {
    renderInPolish(breakdown)

    expect(chartWrappers()).toHaveLength(0)
    expect(document.querySelector(".recharts-tooltip-cursor")).toBeNull()
  })

  it("sizes every bar against the customer's biggest category", () => {
    const { container } = renderInPolish(breakdown)
    const widths = [...container.querySelectorAll<HTMLElement>("[data-slot='category-bar']")].map((bar) => bar.style.width)

    expect(widths).toStrictEqual(["100%", `${(9900 / 23_900) * 100}%`])
  })

  it("truncates a long category name and keeps the whole name in its title", () => {
    renderInPolish(breakdown)
    const label = screen.getByText("Bransoletki urodzeniowe z grawerem i zawieszką")

    expect(label).toHaveClass("truncate")
    expect(label).toHaveAttribute("title", "Bransoletki urodzeniowe z grawerem i zawieszką")
  })

  it("draws the bars in the theme foreground instead of a fixed colour", () => {
    const { container } = renderInPolish(breakdown)
    const bar = container.querySelector("[data-slot='category-bar']")

    expect(bar).toHaveClass("bg-foreground/80")
    expect(bar?.parentElement).toHaveAttribute("aria-hidden", "true")
  })
})

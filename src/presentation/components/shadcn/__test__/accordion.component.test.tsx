import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/src/presentation/components/shadcn/accordion"

afterEach(cleanup)

describe("AccordionTrigger", () => {
  it("heads its section at level 3 by default", () => {
    render(
      <Accordion>
        <AccordionItem value="care">
          <AccordionTrigger>Care</AccordionTrigger>
          <AccordionContent>Polish with a soft cloth.</AccordionContent>
        </AccordionItem>
      </Accordion>,
    )

    expect(screen.getByRole("heading", { level: 3, name: "Care" })).toContainElement(screen.getByRole("button", { name: "Care" }))
  })

  it("heads its section at the level the page asks for", () => {
    render(
      <Accordion>
        <AccordionItem value="care">
          <AccordionTrigger heading="h2">Care</AccordionTrigger>
          <AccordionContent>Polish with a soft cloth.</AccordionContent>
        </AccordionItem>
      </Accordion>,
    )

    expect(screen.getByRole("heading", { level: 2, name: "Care" })).toContainElement(screen.getByRole("button", { name: "Care" }))
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull()
  })
})

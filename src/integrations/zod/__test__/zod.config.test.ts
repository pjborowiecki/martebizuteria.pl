import { runInThisContext } from "node:vm"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { ZOD_JITLESS_INIT_SCRIPT } from "~/src/integrations/zod/zod.config"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ZOD_JITLESS_INIT_SCRIPT", () => {
  it("keeps Zod from probing for eval when it runs before Zod loads, so a strict policy reports nothing", async () => {
    const functionConstructor = vi.fn()
    runInThisContext(ZOD_JITLESS_INIT_SCRIPT)
    vi.stubGlobal("Function", functionConstructor)

    const { z } = await import("zod")
    const schema = z.object({ title: z.string() })

    expect(z.config().jitless).toBe(true)
    expect(schema.parse({ title: "Lapis lazuli necklace" })).toStrictEqual({ title: "Lapis lazuli necklace" })
    expect(functionConstructor).not.toHaveBeenCalled()
  })
})

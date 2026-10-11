import { env } from "cloudflare:workers"

import { createFileRoute } from "@tanstack/react-router"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

const PROBE_KEY = "health-check"

const probe = async (binding: string, read: () => Promise<unknown>): Promise<HealthStatus> => {
  try {
    await read()

    return "ok"
  } catch (error) {
    console.error(`[Health] ${binding} did not answer:`, error)

    return "error"
  }
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const [d1, kv, r2] = await Promise.all([
          probe("D1", () => env.DB.prepare("SELECT 1").first()),
          probe("KV", () => env.CACHE.get(PROBE_KEY)),
          probe("R2", () => env.IMAGES.head(PROBE_KEY)),
        ])
        const healthy = d1 === "ok" && kv === "ok" && r2 === "ok"

        return Response.json(
          { checks: { d1, kv, r2 }, status: healthy ? "ok" : "error" },
          {
            headers: { "Cache-Control": "no-store" },
            status: healthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE,
          },
        )
      },
    },
  },
})

type HealthStatus = "error" | "ok"

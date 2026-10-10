import { HTTP_STATUS, WORKERS_DEV_HOSTS } from "~/src/modules/_core/constants/api"

import { ROUTES } from "~/src/routes"

export const LIVE_SITE_CHECK_ATTEMPTS = 3

export const LIVE_SITE_CHECK_RETRY_DELAY_MS = 5000

export const LIVE_SITE_CHECK_TIMEOUT_MS = 15_000

const wait = async (milliseconds: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, milliseconds)
  await promise
}

const describeAnswer = (response: Response): string =>
  [String(response.status), response.headers.get("content-type")].filter((part) => part !== null).join(" ")

const findProblem = async (url: URL, { contentType, status }: LiveSiteCheck): Promise<string | undefined> => {
  try {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(LIVE_SITE_CHECK_TIMEOUT_MS) })
    const answersAsExpected = response.status === status && response.headers.get("content-type")?.startsWith(contentType) === true

    return answersAsExpected
      ? undefined
      : `GET ${url.href} answered ${describeAnswer(response)} instead of ${String(status)} ${contentType}.`
  } catch (error) {
    return `GET ${url.href} did not answer: ${String(error)}`
  }
}

const checkUntilAnswered = async (url: URL, check: LiveSiteCheck, attempt = 1): Promise<string | undefined> => {
  const problem = await findProblem(url, check)
  if (problem === undefined || attempt === LIVE_SITE_CHECK_ATTEMPTS) {
    return problem
  }

  await wait(LIVE_SITE_CHECK_RETRY_DELAY_MS)

  return checkUntilAnswered(url, check, attempt + 1)
}

export const verifyDeployment = async (environment: DeployedEnvironment): Promise<string> => {
  const origin = `https://${WORKERS_DEV_HOSTS[environment]}`
  const problems = await Promise.all(LIVE_SITE_CHECKS.map((check) => checkUntilAnswered(new URL(check.path, origin), check)))
  const failures = problems.filter((problem) => problem !== undefined)
  if (failures.length > 0) {
    throw new Error([`The ${environment} Worker at ${origin} is deployed but does not answer like the shop:`, ...failures].join("\n"))
  }

  return `The ${environment} Worker at ${origin} answered ${LIVE_SITE_CHECKS.map(({ path }) => path).join(", ")} as expected.`
}

interface LiveSiteCheck {
  readonly contentType: string
  readonly path: string
  readonly status: number
}

type DeployedEnvironment = keyof typeof WORKERS_DEV_HOSTS

const LIVE_SITE_CHECKS: readonly LiveSiteCheck[] = [
  { contentType: "text/html", path: ROUTES.HOME, status: HTTP_STATUS.OK },
  { contentType: "text/html", path: ROUTES.PRODUCTS, status: HTTP_STATUS.OK },
  { contentType: "text/plain", path: "/robots.txt", status: HTTP_STATUS.OK },
  { contentType: "text/plain", path: "/api/webhooks/stripe", status: HTTP_STATUS.METHOD_NOT_ALLOWED },
]

import { type JSX, useCallback } from "react"

import { useLocation, useRouter } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"
import { LogIn } from "lucide-react"

import { signOut } from "~/src/integrations/better-auth/auth.client"

import { Button } from "~/src/presentation/components/shadcn/button"

import { ROUTES } from "~/src/routes"

const signOutRequest = createClientOnlyFn((input: Parameters<typeof signOut>[0]) => signOut(input))

export const SignInAgainButton = ({ label }: Readonly<{ label: string }>): JSX.Element => {
  const router = useRouter()
  const currentPage = useLocation({ select: (location) => location.publicHref })

  const signInAgain = useCallback(() => {
    void signOutRequest({
      fetchOptions: {
        onSuccess: () => {
          globalThis.location.href = router.buildLocation({ search: { redirect: currentPage }, to: ROUTES.AUTH_SIGN_IN }).publicHref
        },
      },
    })
  }, [currentPage, router])

  return (
    <Button className="shrink-0 gap-1.5" onClick={signInAgain} size="sm" type="button" variant="outline">
      <LogIn className="size-3.5" strokeWidth={1.5} />
      {label}
    </Button>
  )
}

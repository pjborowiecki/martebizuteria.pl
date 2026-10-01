import { type JSX } from "react"

import { useQuery } from "@tanstack/react-query"
import QRCode from "qrcode"

const QR_WIDTH = 192

export const TwoFactorQr = ({ uri }: Readonly<TwoFactorQrProps>): JSX.Element => {
  const { data: svg } = useQuery({
    queryFn: () => QRCode.toString(uri, { errorCorrectionLevel: "M", margin: 1, type: "svg", width: QR_WIDTH }),
    queryKey: ["two-factor-qr", uri],
    staleTime: Infinity,
  })

  return (
    <div
      className="mx-auto size-48 bg-white p-2 [&>svg]:size-full"
      dangerouslySetInnerHTML={svg === undefined ? undefined : { __html: svg }}
    />
  )
}

interface TwoFactorQrProps {
  readonly uri: string
}

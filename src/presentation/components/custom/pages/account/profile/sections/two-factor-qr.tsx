import { type JSX, useEffect, useState } from "react"

import QRCode from "qrcode"

const QR_WIDTH = 192

export const TwoFactorQr = ({ uri }: Readonly<TwoFactorQrProps>): JSX.Element => {
  const [svg, setSvg] = useState<string | undefined>(undefined)

  useEffect(() => {
    let active = true
    QRCode.toString(uri, { errorCorrectionLevel: "M", margin: 1, type: "svg", width: QR_WIDTH })
      .then((markup) => {
        if (active) {
          setSvg(markup)
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to render the two-factor QR code:", error)
      })

    return () => {
      active = false
    }
  }, [uri])

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

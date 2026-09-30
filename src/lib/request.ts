export const resolveRequestIp = (headers: Headers): string | undefined => {
  const connectingIp = headers.get("cf-connecting-ip")
  if (connectingIp !== null && connectingIp !== "") {
    return connectingIp
  }

  const forwarded = headers.get("x-forwarded-for")
  if (forwarded === null || forwarded === "") {
    return undefined
  }

  const [first] = forwarded.split(",")
  const trimmed = first?.trim()

  return trimmed === "" ? undefined : trimmed
}

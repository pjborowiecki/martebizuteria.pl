import { createHmac } from "node:crypto"

const PERIOD_SECONDS = 30

const DIGITS = 6

const COUNTER_BYTES = 8

const LOW_NIBBLE = 0x0f

const UNSIGNED_31_BITS = 0x7f_ff_ff_ff

export const currentTotpCode = (secret: string): string => {
  const counter = Buffer.alloc(COUNTER_BYTES)
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / PERIOD_SECONDS)))
  const digest = createHmac("sha1", secret).update(counter).digest()
  const offset = digest.readUInt8(digest.length - 1) & LOW_NIBBLE
  const code = (digest.readUInt32BE(offset) & UNSIGNED_31_BITS) % 10 ** DIGITS

  return String(code).padStart(DIGITS, "0")
}

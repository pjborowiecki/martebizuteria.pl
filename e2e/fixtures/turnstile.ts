export const TURNSTILE_SCRIPT = /^https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/u

export const TURNSTILE_DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX"

export const TURNSTILE_WIDGET_DOUBLE = `
window.turnstile = {
  render(container, options) {
    setTimeout(() => options.callback(${JSON.stringify(TURNSTILE_DUMMY_TOKEN)}), 0)
    return "turnstile-widget-double"
  },
  remove() {},
}
`

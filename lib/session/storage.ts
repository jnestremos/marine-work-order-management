import type { SessionStorage } from "@/lib/session/types"

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

function readBrowserCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null
  }
  const cookies = document.cookie ? document.cookie.split("; ") : []
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=")
    if (separator === -1) {
      continue
    }
    const key = decodeURIComponent(cookie.slice(0, separator))
    if (key !== name) {
      continue
    }
    return decodeURIComponent(cookie.slice(separator + 1))
  }
  return null
}

function writeBrowserCookie(name: string, value: string) {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`
}

function removeBrowserCookie(name: string) {
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`
}

export const cookieStorageAdapter: SessionStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") {
      return null
    }
    const existing = readBrowserCookie(name)
    if (existing !== null) {
      return existing
    }
    const legacy = window.localStorage.getItem(name)
    if (legacy === null) {
      return null
    }
    writeBrowserCookie(name, legacy)
    window.localStorage.removeItem(name)
    return legacy
  },
  setItem: (name, value) => {
    if (typeof document === "undefined") {
      return
    }
    writeBrowserCookie(name, value)
  },
  removeItem: (name) => {
    if (typeof document === "undefined") {
      return
    }
    removeBrowserCookie(name)
  },
}

import type { SessionStorage } from "@/lib/session/types"

export const localStorageAdapter: SessionStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") {
      return null
    }
    return window.localStorage.getItem(name)
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") {
      return
    }
    window.localStorage.setItem(name, value)
  },
  removeItem: (name) => {
    if (typeof window === "undefined") {
      return
    }
    window.localStorage.removeItem(name)
  },
}

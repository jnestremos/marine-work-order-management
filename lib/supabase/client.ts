import { createClient } from "@supabase/supabase-js"
import { sessionStore } from "@/lib/session/store"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error("Supabase URL and publishable key are required")
}

export const supabase = createClient(url, key, {
  global: {
    fetch: (input, init) => {
      const session = sessionStore.getState()
      const headers = new Headers(init?.headers)
      headers.set("x-marine-member-id", session.memberId ?? "")
      headers.set("x-marine-role", session.role)
      headers.set("x-marine-vessel-id", session.vesselId)
      return fetch(input, { ...init, headers })
    },
  },
})

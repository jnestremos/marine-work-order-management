import { ROLE_HOME } from "@/lib/navigation"
import { isRole, type Role } from "@/lib/session/types"

const ROLE_SECTIONS = new Set<string>(["admin", "captain", "crew"])

export function roleFromSessionCookie(raw: string | undefined): Role {
  if (!raw) {
    return "admin"
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null || !("state" in parsed)) {
      return "admin"
    }
    const state = parsed.state
    if (typeof state !== "object" || state === null || !("role" in state)) {
      return "admin"
    }
    return isRole(state.role) ? state.role : "admin"
  } catch {
    return "admin"
  }
}

export function redirectFor(pathname: string, role: Role): string | null {
  const home = ROLE_HOME[role]
  if (pathname === "/") {
    return home
  }
  const section = pathname.split("/").filter(Boolean)[0]
  if (section && ROLE_SECTIONS.has(section) && section !== role) {
    return home
  }
  return null
}

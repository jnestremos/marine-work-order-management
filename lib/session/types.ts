export type Role = "admin" | "captain" | "crew"

export type Vessel = {
  id: string
  name: string
  active: boolean
}

export type Member = {
  id: string
  name: string
  role: Role
  active: boolean
}

export type Assignment = {
  memberId: string
  vesselId: string
}

export type SessionState = {
  vesselId: string
  role: Role
  memberId: string | null
}

export type MarineFixture = {
  vessels: Vessel[]
  members: Member[]
  assignments: Assignment[]
}

export type SessionStorage = {
  getItem: (name: string) => string | null
  setItem: (name: string, value: string) => void
  removeItem: (name: string) => void
}

export const SESSION_STORAGE_KEY = "marine-session"

export const ROLES = ["admin", "captain", "crew"] as const satisfies readonly Role[]

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  captain: "Captain",
  crew: "Crew",
}

export function isRole(value: unknown): value is Role {
  return value === "admin" || value === "captain" || value === "crew"
}

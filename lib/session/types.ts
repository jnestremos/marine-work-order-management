export type Role = "admin" | "captain" | "crew"

export type Vessel = {
  id: string
  name: string
  active: boolean
}

export type Member = {
  id: string
  firstName: string
  lastName: string
  role: Role
  active: boolean
}

export function memberName(member: { firstName: string; lastName: string }) {
  return `${member.firstName.trim()} ${member.lastName.trim()}`.replace(/\s+/g, " ").trim()
}

export type Assignment = {
  memberId: string
  vesselId: string
}

export type ServiceRecord = {
  id: string
  memberId: string
  vesselId: string
  role: Role
  startDate: string
  endDate: string
}

export type SeaServiceStatus = "pending" | "accepted" | "rejected"

export type SeaService = {
  id: string
  memberId: string
  vesselId: string
  role: Role
  signOnDate: string
  signOnPort: string
  signOffDate: string
  signOffPort: string
  status: SeaServiceStatus
}

export const SEA_SERVICE_STATUSES = ["pending", "accepted", "rejected"] as const satisfies readonly SeaServiceStatus[]

export const SEA_SERVICE_STATUS_LABELS: Record<SeaServiceStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
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
  serviceRecords: ServiceRecord[]
  seaServices: SeaService[]
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

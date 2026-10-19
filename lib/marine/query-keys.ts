export type MarineSessionKey = {
  vesselId: string
  role: string
  memberId: string | null
}

export const marineKeys = {
  all: ["marine"] as const,
  sessionChoices: (session: MarineSessionKey) =>
    [...marineKeys.all, "session-choices", session] as const,
  members: (session: MarineSessionKey) => [...marineKeys.all, "members", session] as const,
  vessels: (session: MarineSessionKey) => [...marineKeys.all, "vessels", session] as const,
  assignments: (session: MarineSessionKey) =>
    [...marineKeys.all, "assignments", session] as const,
  serviceRecords: (session: MarineSessionKey) =>
    [...marineKeys.all, "service-records", session] as const,
  seaServices: (session: MarineSessionKey) =>
    [...marineKeys.all, "sea-services", session] as const,
  workOrders: (session: MarineSessionKey) =>
    [...marineKeys.all, "work-orders", session] as const,
}

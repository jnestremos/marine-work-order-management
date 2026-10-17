import type { MarineFixture } from "@/lib/session/types"

export const marineFixture: MarineFixture = {
  vessels: [
    { id: "vessel_horizon", name: "MV Horizon", active: true },
    { id: "vessel_aurora", name: "MV Aurora", active: true },
    { id: "vessel_retired", name: "MV Retired", active: false },
  ],
  members: [
    { id: "member_avery", name: "Avery Chen", role: "admin", active: true },
    { id: "member_blake", name: "Blake Ortiz", role: "captain", active: true },
    { id: "member_casey", name: "Casey Nguyen", role: "crew", active: true },
    { id: "member_drew", name: "Drew Patel", role: "captain", active: true },
    { id: "member_eden", name: "Eden Brooks", role: "crew", active: false },
  ],
  assignments: [
    { memberId: "member_avery", vesselId: "vessel_horizon" },
    { memberId: "member_avery", vesselId: "vessel_aurora" },
    { memberId: "member_blake", vesselId: "vessel_horizon" },
    { memberId: "member_casey", vesselId: "vessel_horizon" },
    { memberId: "member_drew", vesselId: "vessel_aurora" },
    { memberId: "member_eden", vesselId: "vessel_horizon" },
  ],
}

import type { MarineFixture } from "@/lib/session/types"

export const marineFixture: MarineFixture = {
  vessels: [
    { id: "vessel_horizon", name: "MV Horizon", active: true },
    { id: "vessel_aurora", name: "MV Aurora", active: true },
    { id: "vessel_retired", name: "MV Retired", active: false },
  ],
  members: [
    { id: "member_avery", firstName: "Avery", lastName: "Chen", role: "admin", active: true },
    { id: "member_blake", firstName: "Blake", lastName: "Ortiz", role: "captain", active: true },
    { id: "member_casey", firstName: "Casey", lastName: "Nguyen", role: "crew", active: true },
    { id: "member_drew", firstName: "Drew", lastName: "Patel", role: "captain", active: true },
    { id: "member_eden", firstName: "Eden", lastName: "Brooks", role: "crew", active: false },
    { id: "member_frank", firstName: "Frank", lastName: "Adler", role: "admin", active: true },
    { id: "member_gina", firstName: "Gina", lastName: "Morales", role: "captain", active: true },
    { id: "member_harper", firstName: "Harper", lastName: "Singh", role: "crew", active: true },
    { id: "member_ivan", firstName: "Ivan", lastName: "Brooks", role: "crew", active: true },
    { id: "member_june", firstName: "June", lastName: "Okonkwo", role: "captain", active: true },
    { id: "member_kai", firstName: "Kai", lastName: "Nakamura", role: "crew", active: true },
  ],
  assignments: [
    { memberId: "member_avery", vesselId: "vessel_horizon" },
    { memberId: "member_avery", vesselId: "vessel_aurora" },
    { memberId: "member_blake", vesselId: "vessel_horizon" },
    { memberId: "member_casey", vesselId: "vessel_horizon" },
    { memberId: "member_drew", vesselId: "vessel_aurora" },
    { memberId: "member_eden", vesselId: "vessel_horizon" },
    { memberId: "member_frank", vesselId: "vessel_horizon" },
    { memberId: "member_frank", vesselId: "vessel_aurora" },
    { memberId: "member_gina", vesselId: "vessel_horizon" },
    { memberId: "member_gina", vesselId: "vessel_aurora" },
    { memberId: "member_harper", vesselId: "vessel_horizon" },
    { memberId: "member_ivan", vesselId: "vessel_horizon" },
    { memberId: "member_june", vesselId: "vessel_aurora" },
    { memberId: "member_kai", vesselId: "vessel_horizon" },
  ],
}

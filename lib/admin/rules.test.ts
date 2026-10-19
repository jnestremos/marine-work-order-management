import { describe, expect, it } from "vitest"
import {
  adminAssignmentBlock,
  captainAssignmentBlock,
  captainRoleBlock,
  duplicateAssignment,
  duplicateName,
  inactiveAssignmentBlock,
  memberDeactivateBlock,
  vesselAssignmentSummary,
  withoutVesselAssignments,
} from "@/lib/admin/rules"
import { marineFixture } from "@/lib/fixtures/marine"
import { memberName, type MarineFixture } from "@/lib/session/types"

const sample: MarineFixture = {
  vessels: [
    { id: "vessel_horizon", name: "MV Horizon", active: true },
    { id: "vessel_aurora", name: "MV Aurora", active: true },
    { id: "vessel_retired", name: "MV Retired", active: false },
  ],
  members: [
    { id: "member_avery", firstName: "Avery", lastName: "Chen", role: "admin", active: true },
    { id: "member_frank", firstName: "Frank", lastName: "Adler", role: "admin", active: true },
    { id: "member_blake", firstName: "Blake", lastName: "Ortiz", role: "captain", active: true },
    { id: "member_eden", firstName: "Eden", lastName: "Brooks", role: "crew", active: false },
  ],
  assignments: [
    { memberId: "member_blake", vesselId: "vessel_horizon" },
    { memberId: "member_blake", vesselId: "vessel_aurora" },
    { memberId: "member_eden", vesselId: "vessel_horizon" },
  ],
}

function userNames(members: MarineFixture["members"]) {
  return members.map((member) => ({ id: member.id, name: memberName(member) }))
}

describe("duplicateName", () => {
  it("matches a name ignoring case", () => {
    expect(duplicateName(userNames(sample.members), "avery chen")).toBe(true)
  })

  it("matches an inactive record", () => {
    expect(duplicateName(userNames(sample.members), "eden brooks")).toBe(true)
  })

  it("allows a record to keep its own name", () => {
    expect(duplicateName(userNames(sample.members), "Avery Chen", "member_avery")).toBe(false)
  })

  it("matches a vessel name ignoring case, including inactive vessels", () => {
    expect(duplicateName(sample.vessels, "mv retired")).toBe(true)
  })
})

describe("withoutVesselAssignments", () => {
  it("removes every assignment for the deactivated vessel", () => {
    expect(withoutVesselAssignments(sample.assignments, "vessel_horizon")).toEqual([
      { memberId: "member_blake", vesselId: "vessel_aurora" },
    ])
  })
})

describe("duplicateAssignment", () => {
  it("rejects a user already assigned to that vessel", () => {
    expect(
      duplicateAssignment(sample.assignments, "member_blake", "vessel_horizon"),
    ).toBe(true)
  })

  it("allows a new pair", () => {
    expect(
      duplicateAssignment(sample.assignments, "member_eden", "vessel_aurora"),
    ).toBe(false)
  })
})

describe("memberDeactivateBlock", () => {
  it("names every vessel the user is still assigned to", () => {
    expect(memberDeactivateBlock(sample, "member_blake")).toBe(
      "Remove Blake Ortiz from MV Horizon and MV Aurora before deactivating",
    )
  })

  it("names one vessel", () => {
    expect(memberDeactivateBlock(sample, "member_eden")).toBe(
      "Remove Eden Brooks from MV Horizon before deactivating",
    )
  })

  it("allows a user with no assignments", () => {
    expect(memberDeactivateBlock(sample, "member_avery")).toBeNull()
  })
})

describe("inactiveAssignmentBlock", () => {
  it("rejects a deactivated user", () => {
    expect(inactiveAssignmentBlock(sample, "member_eden")).toBe(
      "Deactivated users are not assigned to vessels",
    )
  })

  it("allows an active user", () => {
    expect(inactiveAssignmentBlock(sample, "member_blake")).toBeNull()
  })
})

describe("adminAssignmentBlock", () => {
  it("rejects an admin", () => {
    expect(adminAssignmentBlock(sample, "member_avery")).toBe(
      "Admins are not assigned to vessels",
    )
  })

  it("allows a captain", () => {
    expect(adminAssignmentBlock(sample, "member_blake")).toBeNull()
  })
})

describe("vesselAssignmentSummary", () => {
  it("names the captain and counts assigned crew", () => {
    expect(vesselAssignmentSummary(marineFixture, "vessel_horizon")).toBe(
      "Blake Ortiz · 4 crew",
    )
    expect(vesselAssignmentSummary(marineFixture, "vessel_aurora")).toBe(
      "Drew Patel · No crew",
    )
    expect(vesselAssignmentSummary(marineFixture, "vessel_retired")).toBe(
      "No captain · No crew",
    )
  })
})

describe("captainAssignmentBlock", () => {
  it("rejects a second captain on the same vessel", () => {
    expect(captainAssignmentBlock(marineFixture, "member_gina", "vessel_horizon")).toBe(
      "MV Horizon already has a captain",
    )
  })

  it("allows the captain already assigned to that vessel", () => {
    expect(captainAssignmentBlock(marineFixture, "member_blake", "vessel_horizon")).toBeNull()
  })

  it("allows a captain on a vessel that has none", () => {
    expect(captainAssignmentBlock(marineFixture, "member_gina", "vessel_retired")).toBeNull()
  })

  it("allows crew on a vessel that already has a captain", () => {
    expect(captainAssignmentBlock(marineFixture, "member_casey", "vessel_aurora")).toBeNull()
  })
})

describe("captainRoleBlock", () => {
  it("rejects promoting a member on a vessel that already has a captain", () => {
    expect(captainRoleBlock(marineFixture, "member_casey")).toBe(
      "MV Horizon already has a captain",
    )
  })

  it("allows promoting a member who is not assigned", () => {
    expect(captainRoleBlock(marineFixture, "member_june")).toBeNull()
  })
})

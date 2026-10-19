import { describe, expect, it } from "vitest"
import {
  adminAssignmentBlock,
  captainActiveVesselBlock,
  captainAssignmentBlock,
  captainRoleBlock,
  duplicateAssignment,
  duplicateName,
  inactiveAssignmentBlock,
  memberDeactivateBlock,
  memberRoleChangeBlock,
  memberWorkOrderBlock,
  vesselActivationCaptainBlock,
  vesselWorkOrderBlock,
  vesselAssignmentSummary,
  withoutVesselAssignments,
} from "@/lib/admin/rules"
import { marineFixture } from "@/lib/fixtures/marine"
import { memberName, type MarineFixture } from "@/lib/session/types"
import type { WorkOrder } from "@/lib/work-orders/types"

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
  serviceRecords: [],
  seaServices: [],
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

describe("memberRoleChangeBlock", () => {
  it("names every vessel the user is still assigned to", () => {
    expect(memberRoleChangeBlock(sample, "member_blake")).toBe(
      "Remove Blake Ortiz from MV Horizon and MV Aurora before changing roles",
    )
  })

  it("names one vessel", () => {
    expect(memberRoleChangeBlock(sample, "member_eden")).toBe(
      "Remove Eden Brooks from MV Horizon before changing roles",
    )
  })

  it("uses a serial comma for three vessels", () => {
    const directory: MarineFixture = {
      ...sample,
      assignments: [
        ...sample.assignments,
        { memberId: "member_blake", vesselId: "vessel_retired" },
      ],
    }
    expect(memberRoleChangeBlock(directory, "member_blake")).toBe(
      "Remove Blake Ortiz from MV Horizon, MV Aurora, and MV Retired before changing roles",
    )
  })

  it("allows a user with no assignments", () => {
    expect(memberRoleChangeBlock(sample, "member_avery")).toBeNull()
  })
})

function order(partial: Pick<WorkOrder, "code" | "status" | "vesselId" | "assigneeId" | "createdById">): WorkOrder {
  return {
    id: partial.code,
    title: "Pump",
    issue: "Leak",
    solution: "",
    ...partial,
  }
}

describe("memberWorkOrderBlock", () => {
  const orders = [
    order({
      code: "WO-1002",
      status: "in_progress",
      vesselId: "vessel_horizon",
      assigneeId: "member_casey",
      createdById: "member_blake",
    }),
    order({
      code: "WO-1001",
      status: "open",
      vesselId: "vessel_horizon",
      assigneeId: "member_harper",
      createdById: "member_blake",
    }),
    order({
      code: "WO-1003",
      status: "done",
      vesselId: "vessel_horizon",
      assigneeId: "member_casey",
      createdById: "member_blake",
    }),
  ]

  it("names unresolved orders for the assigned crew member", () => {
    expect(memberWorkOrderBlock(orders, "member_casey", "Casey Nguyen")).toBe(
      "Resolve WO-1002 before deactivating Casey Nguyen",
    )
  })

  it("names every unresolved order created by the captain", () => {
    expect(memberWorkOrderBlock(orders, "member_blake", "Blake Ortiz")).toBe(
      "Resolve WO-1001 and WO-1002 before deactivating Blake Ortiz",
    )
  })

  it("allows a member whose orders are done", () => {
    expect(
      memberWorkOrderBlock(
        [orders[2]],
        "member_casey",
        "Casey Nguyen",
      ),
    ).toBeNull()
  })
})

describe("vesselWorkOrderBlock", () => {
  it("names unresolved orders on the vessel", () => {
    expect(
      vesselWorkOrderBlock(
        [
          order({
            code: "WO-1003",
            status: "open",
            vesselId: "vessel_horizon",
            assigneeId: "member_casey",
            createdById: "member_blake",
          }),
          order({
            code: "WO-1001",
            status: "in_progress",
            vesselId: "vessel_horizon",
            assigneeId: "member_harper",
            createdById: "member_blake",
          }),
          order({
            code: "WO-1002",
            status: "done",
            vesselId: "vessel_horizon",
            assigneeId: "member_casey",
            createdById: "member_blake",
          }),
          order({
            code: "WO-1005",
            status: "open",
            vesselId: "vessel_horizon",
            assigneeId: "member_ivan",
            createdById: "member_blake",
          }),
          order({
            code: "WO-1004",
            status: "open",
            vesselId: "vessel_aurora",
            assigneeId: "member_ivan",
            createdById: "member_drew",
          }),
        ],
        "vessel_horizon",
        "MV Horizon",
      ),
    ).toBe("Resolve WO-1001, WO-1003, and WO-1005 before deactivating MV Horizon")
  })

  it("allows a vessel whose orders are done", () => {
    expect(
      vesselWorkOrderBlock(
        [
          order({
            code: "WO-1001",
            status: "done",
            vesselId: "vessel_aurora",
            assigneeId: "member_ivan",
            createdById: "member_drew",
          }),
        ],
        "vessel_aurora",
        "MV Aurora",
      ),
    ).toBeNull()
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

describe("captainActiveVesselBlock", () => {
  it("rejects a captain who already has an active vessel", () => {
    expect(captainActiveVesselBlock(marineFixture, "member_blake", "vessel_aurora")).toBe(
      "Blake Ortiz is already assigned to MV Horizon",
    )
  })

  it("allows the captain's current vessel", () => {
    expect(captainActiveVesselBlock(marineFixture, "member_blake", "vessel_horizon")).toBeNull()
  })

  it("allows a captain with no active vessel", () => {
    expect(captainActiveVesselBlock(marineFixture, "member_gina", "vessel_aurora")).toBeNull()
  })

  it("allows crew who are assigned to another vessel", () => {
    expect(captainActiveVesselBlock(marineFixture, "member_casey", "vessel_aurora")).toBeNull()
  })

  it("ignores an inactive vessel the captain is also assigned to", () => {
    const directory: MarineFixture = {
      ...marineFixture,
      assignments: [
        ...marineFixture.assignments,
        { memberId: "member_blake", vesselId: "vessel_retired" },
      ],
    }
    expect(captainActiveVesselBlock(directory, "member_blake", "vessel_aurora")).toBe(
      "Blake Ortiz is already assigned to MV Horizon",
    )
  })

  it("lists every other active vessel", () => {
    expect(captainActiveVesselBlock(sample, "member_blake", "vessel_retired")).toBe(
      "Blake Ortiz is already assigned to MV Horizon and MV Aurora",
    )
  })
})

describe("vesselActivationCaptainBlock", () => {
  it("rejects activation when the captain already has an active vessel", () => {
    const directory: MarineFixture = {
      ...marineFixture,
      assignments: [
        ...marineFixture.assignments,
        { memberId: "member_blake", vesselId: "vessel_retired" },
      ],
    }
    expect(vesselActivationCaptainBlock(directory, "vessel_retired")).toBe(
      "Blake Ortiz is already assigned to MV Horizon",
    )
  })

  it("allows activation when the captain has no other active vessel", () => {
    const directory: MarineFixture = {
      ...marineFixture,
      assignments: [
        ...marineFixture.assignments,
        { memberId: "member_gina", vesselId: "vessel_retired" },
      ],
    }
    expect(vesselActivationCaptainBlock(directory, "vessel_retired")).toBeNull()
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

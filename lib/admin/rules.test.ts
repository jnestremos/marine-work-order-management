import { describe, expect, it } from "vitest"
import {
  duplicateAssignment,
  duplicateName,
  lastAdminBlock,
} from "@/lib/admin/rules"
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
    { memberId: "member_avery", vesselId: "vessel_horizon" },
    { memberId: "member_avery", vesselId: "vessel_aurora" },
    { memberId: "member_frank", vesselId: "vessel_horizon" },
    { memberId: "member_frank", vesselId: "vessel_aurora" },
    { memberId: "member_blake", vesselId: "vessel_horizon" },
    { memberId: "member_eden", vesselId: "vessel_horizon" },
  ],
}

function withoutFrank(directory: MarineFixture): MarineFixture {
  return {
    ...directory,
    members: directory.members.map((member) =>
      member.id === "member_frank" ? { ...member, active: false } : member,
    ),
  }
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

describe("duplicateAssignment", () => {
  it("rejects a user already assigned to that vessel", () => {
    expect(
      duplicateAssignment(sample.assignments, "member_avery", "vessel_horizon"),
    ).toBe(true)
  })

  it("allows a new pair", () => {
    expect(
      duplicateAssignment(sample.assignments, "member_blake", "vessel_aurora"),
    ).toBe(false)
  })
})

describe("lastAdminBlock", () => {
  it("allows deactivating Avery while Frank is still an active admin", () => {
    expect(
      lastAdminBlock(sample, {
        type: "deactivate-member",
        memberId: "member_avery",
      }),
    ).toBeNull()
  })

  it("names every vessel when deactivating the last active admin", () => {
    expect(
      lastAdminBlock(withoutFrank(sample), {
        type: "deactivate-member",
        memberId: "member_avery",
      }),
    ).toBe("MV Horizon and MV Aurora need an active admin")
  })

  it("uses a serial comma for three vessels", () => {
    const three = withoutFrank(sample)
    const directory: MarineFixture = {
      ...three,
      vessels: [
        ...three.vessels,
        { id: "vessel_north", name: "MV North", active: true },
      ],
      assignments: [
        ...three.assignments,
        { memberId: "member_avery", vesselId: "vessel_north" },
      ],
    }
    expect(
      lastAdminBlock(directory, {
        type: "deactivate-member",
        memberId: "member_avery",
      }),
    ).toBe("MV Horizon, MV Aurora, and MV North need an active admin")
  })

  it("names every vessel when the last admin changes role", () => {
    expect(
      lastAdminBlock(withoutFrank(sample), {
        type: "set-member-role",
        memberId: "member_avery",
        role: "captain",
      }),
    ).toBe("MV Horizon and MV Aurora need an active admin")
  })

  it("allows changing a role to admin", () => {
    expect(
      lastAdminBlock(sample, {
        type: "set-member-role",
        memberId: "member_blake",
        role: "admin",
      }),
    ).toBeNull()
  })

  it("allows deactivating someone who is not an active admin", () => {
    expect(
      lastAdminBlock(sample, {
        type: "deactivate-member",
        memberId: "member_blake",
      }),
    ).toBeNull()
  })

  it("names the vessel when its last admin assignment is removed", () => {
    expect(
      lastAdminBlock(withoutFrank(sample), {
        type: "remove-assignment",
        memberId: "member_avery",
        vesselId: "vessel_horizon",
      }),
    ).toBe("MV Horizon needs an active admin")
  })

  it("allows removing an admin from an inactive vessel", () => {
    const directory: MarineFixture = {
      ...withoutFrank(sample),
      assignments: [
        ...sample.assignments,
        { memberId: "member_avery", vesselId: "vessel_retired" },
      ],
    }
    expect(
      lastAdminBlock(directory, {
        type: "remove-assignment",
        memberId: "member_avery",
        vesselId: "vessel_retired",
      }),
    ).toBeNull()
  })

  it("blocks activating a vessel that has no active admin", () => {
    expect(
      lastAdminBlock(sample, {
        type: "activate-vessel",
        vesselId: "vessel_retired",
      }),
    ).toBe("MV Retired needs an active admin")
  })

  it("allows activating a vessel after an active admin is assigned", () => {
    const directory: MarineFixture = {
      ...sample,
      assignments: [
        ...sample.assignments,
        { memberId: "member_avery", vesselId: "vessel_retired" },
      ],
    }
    expect(
      lastAdminBlock(directory, {
        type: "activate-vessel",
        vesselId: "vessel_retired",
      }),
    ).toBeNull()
  })

  it("allows deactivating a vessel", () => {
    expect(
      lastAdminBlock(sample, {
        type: "deactivate-vessel",
        vesselId: "vessel_horizon",
      }),
    ).toBeNull()
  })
})

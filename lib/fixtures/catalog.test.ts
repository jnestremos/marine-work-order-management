import { describe, expect, it } from "vitest"
import { marineFixture } from "@/lib/fixtures/marine"
import {
  addMember,
  addVessel,
  cloneMarineFixture,
  patchAssignment,
  patchMember,
  patchVessel,
} from "@/lib/fixtures/catalog"

describe("catalog helpers", () => {
  it("clones the marine fixture", () => {
    const clone = cloneMarineFixture()
    expect(clone).toEqual(marineFixture)
    expect(clone).not.toBe(marineFixture)
  })

  it("adds a vessel and member, then toggles an assignment", () => {
    let catalog = cloneMarineFixture()
    const vessel = addVessel(catalog, "MV Tide")
    expect(vessel?.id).toBe("vessel_mv_tide")
    catalog = vessel!.catalog

    const member = addMember(catalog, "Lane Quinn", "crew")
    expect(member?.id).toBe("member_lane_quinn")
    catalog = member!.catalog

    catalog = patchAssignment(
      catalog,
      "member_lane_quinn",
      "vessel_mv_tide",
      true,
    )
    expect(catalog.assignments).toContainEqual({
      memberId: "member_lane_quinn",
      vesselId: "vessel_mv_tide",
    })

    catalog = patchMember(catalog, "member_lane_quinn", { role: "captain" })
    catalog = patchVessel(catalog, "vessel_mv_tide", { active: false })
    expect(
      catalog.members.find((item) => item.id === "member_lane_quinn")?.role,
    ).toBe("captain")
    expect(
      catalog.vessels.find((item) => item.id === "vessel_mv_tide")?.active,
    ).toBe(false)
  })

  it("rejects empty names", () => {
    const catalog = cloneMarineFixture()
    expect(addVessel(catalog, "  ")).toBeNull()
    expect(addMember(catalog, "", "crew")).toBeNull()
  })
})

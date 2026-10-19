import { describe, expect, it } from "vitest"
import { marineFixture } from "@/lib/fixtures/marine"
import {
  buildWorkOrder,
  captainVessels,
  eligibleCrew,
  nextWorkOrderCode,
  workOrderCreateError,
  workOrdersForCaptain,
} from "@/lib/work-orders/rules"
import type { WorkOrder } from "@/lib/work-orders/types"

const blakeHorizon = {
  vesselId: "vessel_horizon",
  title: "Pump seal",
  issue: "Leaking at the flange",
  assigneeId: "member_casey",
  createdById: "member_blake",
}

describe("captainVessels", () => {
  it("lists active vessels assigned to that captain", () => {
    expect(captainVessels(marineFixture, "member_blake").map((vessel) => vessel.id)).toEqual([
      "vessel_horizon",
    ])
    expect(captainVessels(marineFixture, "member_drew").map((vessel) => vessel.id)).toEqual([
      "vessel_aurora",
    ])
  })

  it("omits an inactive vessel", () => {
    const directory = {
      ...marineFixture,
      vessels: marineFixture.vessels.map((vessel) =>
        vessel.id === "vessel_horizon" ? { ...vessel, active: false } : vessel,
      ),
    }
    expect(captainVessels(directory, "member_blake")).toEqual([])
  })
})

describe("eligibleCrew", () => {
  it("lists active crew assigned to the vessel", () => {
    expect(eligibleCrew(marineFixture, "vessel_horizon").map((member) => member.id)).toEqual([
      "member_casey",
      "member_harper",
      "member_ivan",
      "member_kai",
    ])
  })

  it("returns no crew for MV Aurora", () => {
    expect(eligibleCrew(marineFixture, "vessel_aurora")).toEqual([])
  })
})

describe("nextWorkOrderCode", () => {
  it("starts at WO-1001", () => {
    expect(nextWorkOrderCode([])).toBe("WO-1001")
  })

  it("increments the highest code", () => {
    expect(
      nextWorkOrderCode([
        { code: "WO-1001" } as WorkOrder,
        { code: "WO-1004" } as WorkOrder,
      ]),
    ).toBe("WO-1005")
  })
})

describe("workOrderCreateError", () => {
  it("accepts active crew on the captain's vessel", () => {
    expect(workOrderCreateError(marineFixture, blakeHorizon)).toBeNull()
  })

  it("rejects an inactive crew member", () => {
    expect(
      workOrderCreateError(marineFixture, { ...blakeHorizon, assigneeId: "member_eden" }),
    ).toBe("Crew must be an active member of this vessel")
  })

  it("rejects an admin, a captain, and crew assigned to another vessel", () => {
    const caseyOnAurora = {
      ...marineFixture,
      assignments: marineFixture.assignments.map((assignment) =>
        assignment.memberId === "member_casey"
          ? { ...assignment, vesselId: "vessel_aurora" }
          : assignment,
      ),
    }
    expect(
      workOrderCreateError(marineFixture, { ...blakeHorizon, assigneeId: "member_avery" }),
    ).toBe("Crew must be an active member of this vessel")
    expect(
      workOrderCreateError(marineFixture, { ...blakeHorizon, assigneeId: "member_gina" }),
    ).toBe("Crew must be an active member of this vessel")
    expect(
      workOrderCreateError(caseyOnAurora, { ...blakeHorizon, assigneeId: "member_casey" }),
    ).toBe("Crew must be an active member of this vessel")
  })

  it("rejects a captain creating on a vessel they are not assigned to", () => {
    expect(
      workOrderCreateError(marineFixture, { ...blakeHorizon, createdById: "member_drew" }),
    ).toBe("Crew must be an active member of this vessel")
  })
})

describe("buildWorkOrder", () => {
  it("stores an open order with an empty solution and the next code", () => {
    const created = buildWorkOrder(marineFixture, [], { ...blakeHorizon, id: "wo_1" })
    expect(created).toEqual({
      ok: true,
      order: {
        id: "wo_1",
        code: "WO-1001",
        vesselId: "vessel_horizon",
        title: "Pump seal",
        issue: "Leaking at the flange",
        solutions: [],
        status: "open",
        assigneeId: "member_casey",
        createdById: "member_blake",
      },
    })
    if (!created.ok) return
    const second = buildWorkOrder(marineFixture, [created.order], {
      ...blakeHorizon,
      id: "wo_2",
      title: "  Radio check  ",
      issue: "  No signal  ",
    })
    expect(second.ok).toBe(true)
    if (second.ok) {
      expect(second.order.code).toBe("WO-1002")
      expect(second.order.title).toBe("Radio check")
      expect(second.order.issue).toBe("No signal")
    }
  })

  it("returns the no-crew error for MV Aurora", () => {
    expect(
      buildWorkOrder(marineFixture, [], {
        id: "wo_aurora",
        vesselId: "vessel_aurora",
        title: "Bilge",
        issue: "Slow fill",
        assigneeId: "",
        createdById: "member_drew",
      }),
    ).toEqual({ ok: false, error: "This vessel has no active crew" })
  })
})

describe("workOrdersForCaptain", () => {
  const horizonBlakeOlder: WorkOrder = {
    id: "wo_1",
    code: "WO-1001",
    vesselId: "vessel_horizon",
    title: "Pump seal",
    issue: "Leaking",
    solutions: [],
    status: "open",
    assigneeId: "member_casey",
    createdById: "member_blake",
  }
  const horizonBlakeNewer: WorkOrder = {
    ...horizonBlakeOlder,
    id: "wo_1b",
    code: "WO-1002",
    title: "Radio check",
  }
  const horizonGina: WorkOrder = {
    ...horizonBlakeOlder,
    id: "wo_2",
    code: "WO-1003",
    createdById: "member_gina",
  }
  const auroraDrew: WorkOrder = {
    ...horizonBlakeOlder,
    id: "wo_3",
    code: "WO-1004",
    vesselId: "vessel_aurora",
    createdById: "member_drew",
  }

  it("returns only that captain's orders on that vessel, latest code first", () => {
    const orders = [horizonBlakeOlder, horizonBlakeNewer, horizonGina, auroraDrew]
    expect(workOrdersForCaptain(orders, "vessel_horizon", "member_blake")).toEqual([
      horizonBlakeNewer,
      horizonBlakeOlder,
    ])
    expect(workOrdersForCaptain(orders, "vessel_horizon", "member_gina")).toEqual([
      horizonGina,
    ])
    expect(workOrdersForCaptain(orders, "vessel_aurora", "member_drew")).toEqual([
      auroraDrew,
    ])
    expect(workOrdersForCaptain(orders, "vessel_horizon", "member_drew")).toEqual([])
  })
})

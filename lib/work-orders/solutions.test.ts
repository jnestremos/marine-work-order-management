import { describe, expect, it } from "vitest"
import { reviewLatestSolution, solutionSubmitBlock, submitSolution } from "@/lib/work-orders/solutions"
import type { WorkOrder } from "@/lib/work-orders/types"

function order(solutions: WorkOrder["solutions"], status: WorkOrder["status"] = "open"): WorkOrder {
  return {
    id: "wo_1",
    code: "WO-1001",
    vesselId: "vessel_horizon",
    title: "Light",
    issue: "Dark",
    solutions,
    status,
    assigneeId: "member_casey",
    createdById: "member_blake",
  }
}

describe("solutionSubmitBlock", () => {
  it("allows the first solution and another after a rejection", () => {
    expect(solutionSubmitBlock(order([]))).toBeNull()
    expect(
      solutionSubmitBlock(
        order([{ id: "sol_1", text: "First try", status: "rejected" }], "rejected"),
      ),
    ).toBeNull()
  })

  it("blocks a second solution while one is pending or accepted", () => {
    expect(
      solutionSubmitBlock(order([{ id: "sol_1", text: "Waiting", status: "pending" }], "done")),
    ).toBe("Wait until the current solution is rejected before sending another")
    expect(
      solutionSubmitBlock(
        order([{ id: "sol_1", text: "Kept", status: "accepted" }], "accepted"),
      ),
    ).toBe("This solution was accepted")
  })
})

describe("submitSolution", () => {
  it("records one pending solution and marks the order done", () => {
    const result = submitSolution(order([]), "  Replaced the lamp  ", "sol_1")
    expect(result).toMatchObject({
      status: "done",
      solutions: [{ id: "sol_1", text: "Replaced the lamp", status: "pending" }],
    })
  })

  it("refuses another solution until the current one is rejected", () => {
    const pending = order([{ id: "sol_1", text: "Waiting", status: "pending" }], "done")
    expect(submitSolution(pending, "Another", "sol_2")).toBe(
      "Wait until the current solution is rejected before sending another",
    )
    const rejected = reviewLatestSolution(pending, "rejected")
    expect(rejected?.status).toBe("rejected")
    const next = rejected ? submitSolution(rejected, "Second try", "sol_2") : "missing"
    expect(next).toMatchObject({
      status: "done",
      solutions: [
        { id: "sol_1", status: "rejected" },
        { id: "sol_2", text: "Second try", status: "pending" },
      ],
    })
  })
})

import type { WorkOrder, WorkOrderSolution } from "@/lib/work-orders/types"

export function latestSolution(order: WorkOrder): WorkOrderSolution | null {
  return order.solutions.at(-1) ?? null
}

export function solutionSubmitBlock(order: WorkOrder): string | null {
  const latest = latestSolution(order)
  if (!latest || latest.status === "rejected") {
    return null
  }
  if (latest.status === "accepted") {
    return "This solution was accepted"
  }
  return "Wait until the current solution is rejected before sending another"
}

export function submitSolution(order: WorkOrder, text: string, id: string): WorkOrder | string {
  const trimmed = text.trim()
  if (!trimmed) {
    return "Solution is required"
  }
  const block = solutionSubmitBlock(order)
  if (block) {
    return block
  }
  return {
    ...order,
    status: "done",
    solutions: [...order.solutions, { id, text: trimmed, status: "pending" }],
  }
}

export function reviewLatestSolution(
  order: WorkOrder,
  status: "accepted" | "rejected",
): WorkOrder | null {
  const latest = latestSolution(order)
  if (order.status !== "done" || !latest || latest.status !== "pending") {
    return null
  }
  return {
    ...order,
    status,
    solutions: order.solutions.map((solution, index) =>
      index === order.solutions.length - 1 ? { ...solution, status } : solution,
    ),
  }
}

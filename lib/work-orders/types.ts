export type WorkOrderStatus = "open" | "in_progress" | "done" | "accepted" | "rejected"

export type SolutionStatus = "pending" | "accepted" | "rejected"

export type WorkOrderSolution = {
  id: string
  text: string
  status: SolutionStatus
  postedAt: string
}

export type WorkOrder = {
  id: string
  code: string
  vesselId: string
  title: string
  issue: string
  solutions: WorkOrderSolution[]
  status: WorkOrderStatus
  assigneeId: string
  createdById: string
}

export const SOLUTION_STATUS_LABELS: Record<SolutionStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
}

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
  accepted: "Accepted",
  rejected: "Rejected",
}

export function workOrderIsUnresolved(status: WorkOrderStatus) {
  return status === "open" || status === "in_progress"
}

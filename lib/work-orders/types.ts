export type WorkOrderStatus = "open" | "in_progress" | "done"

export type WorkOrder = {
  id: string
  code: string
  vesselId: string
  title: string
  issue: string
  solution: string
  status: WorkOrderStatus
  assigneeId: string
  createdById: string
}

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
}

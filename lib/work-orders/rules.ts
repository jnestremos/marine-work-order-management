import type { MarineFixture, Member, Vessel } from "@/lib/session/types"
import type { WorkOrder } from "@/lib/work-orders/types"

export type WorkOrderDraft = {
  vesselId: string
  title: string
  issue: string
  assigneeId: string
  createdById: string
}

export function captainVessels(directory: MarineFixture, captainId: string): Vessel[] {
  return directory.vessels.filter(
    (vessel) =>
      vessel.active &&
      directory.assignments.some(
        (assignment) =>
          assignment.memberId === captainId && assignment.vesselId === vessel.id,
      ),
  )
}

export function eligibleCrew(directory: MarineFixture, vesselId: string): Member[] {
  return directory.members.filter(
    (member) =>
      member.active &&
      member.role === "crew" &&
      directory.assignments.some(
        (assignment) =>
          assignment.memberId === member.id && assignment.vesselId === vesselId,
      ),
  )
}

export function nextWorkOrderCode(orders: WorkOrder[]): string {
  const highest = orders.reduce((max, order) => {
    const match = /^WO-(\d+)$/.exec(order.code)
    return match ? Math.max(max, Number(match[1])) : max
  }, 1000)
  return `WO-${highest + 1}`
}

export function workOrderCreateError(
  directory: MarineFixture,
  input: WorkOrderDraft,
): string | null {
  const assigned = captainVessels(directory, input.createdById).some(
    (vessel) => vessel.id === input.vesselId,
  )
  const crew = eligibleCrew(directory, input.vesselId)
  if (crew.length === 0) {
    return "This vessel has no active crew"
  }
  if (!assigned || !crew.some((member) => member.id === input.assigneeId)) {
    return "Crew must be an active member of this vessel"
  }
  return null
}

export function buildWorkOrder(
  directory: MarineFixture,
  orders: WorkOrder[],
  input: WorkOrderDraft & { id: string },
): { ok: true; order: WorkOrder } | { ok: false; error: string } {
  const error = workOrderCreateError(directory, input)
  if (error) {
    return { ok: false, error }
  }
  return {
    ok: true,
    order: {
      id: input.id,
      code: nextWorkOrderCode(orders),
      vesselId: input.vesselId,
      title: input.title.trim(),
      issue: input.issue.trim(),
      solution: "",
      status: "open",
      assigneeId: input.assigneeId,
      createdById: input.createdById,
    },
  }
}

export function workOrdersForCaptain(
  orders: WorkOrder[],
  vesselId: string,
  captainId: string,
): WorkOrder[] {
  return orders.filter(
    (order) => order.vesselId === vesselId && order.createdById === captainId,
  )
}

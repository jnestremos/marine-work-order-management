import { memberName, type MarineFixture, type Member } from "@/lib/session/types"
import type { WorkOrder } from "@/lib/work-orders/types"

export function duplicateName(
  records: readonly { id: string; name: string }[],
  name: string,
  exceptId?: string,
): boolean {
  const key = name.trim().toLowerCase()
  return records.some(
    (record) => record.id !== exceptId && record.name.trim().toLowerCase() === key,
  )
}

export function withoutVesselAssignments<T extends { vesselId: string }>(
  assignments: readonly T[],
  vesselId: string,
): T[] {
  return assignments.filter((assignment) => assignment.vesselId !== vesselId)
}

export function duplicateAssignment(
  assignments: readonly { memberId: string; vesselId: string }[],
  memberId: string,
  vesselId: string,
): boolean {
  return assignments.some(
    (assignment) =>
      assignment.memberId === memberId && assignment.vesselId === vesselId,
  )
}

function isAssigned(directory: MarineFixture, memberId: string, vesselId: string): boolean {
  return directory.assignments.some(
    (assignment) => assignment.memberId === memberId && assignment.vesselId === vesselId,
  )
}

export function assignedCaptain(
  directory: MarineFixture,
  vesselId: string,
): Member | undefined {
  return directory.members.find(
    (member) =>
      member.active && member.role === "captain" && isAssigned(directory, member.id, vesselId),
  )
}

export function assignedCrewCount(directory: MarineFixture, vesselId: string): number {
  return directory.members.filter(
    (member) =>
      member.active && member.role === "crew" && isAssigned(directory, member.id, vesselId),
  ).length
}

export function vesselAssignmentSummary(directory: MarineFixture, vesselId: string): string {
  const captain = assignedCaptain(directory, vesselId)
  const crew = assignedCrewCount(directory, vesselId)
  const captainText = captain ? memberName(captain) : "No captain"
  const crewText = crew === 0 ? "No crew" : crew === 1 ? "1 crew" : `${crew} crew`
  return `${captainText} · ${crewText}`
}

function captainTakenMessage(directory: MarineFixture, vesselIds: readonly string[]): string | null {
  const names = vesselIds.flatMap((vesselId) => {
    const vessel = directory.vessels.find((item) => item.id === vesselId)
    return vessel ? [vessel.name] : []
  })
  if (names.length === 0) {
    return null
  }
  if (names.length === 1) {
    return `${names[0]} already has a captain`
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} already have a captain`
  }
  const leading = names.slice(0, -1).join(", ")
  return `${leading}, and ${names[names.length - 1]} already have a captain`
}

export function captainAssignmentBlock(
  directory: MarineFixture,
  memberId: string,
  vesselId: string,
): string | null {
  const member = directory.members.find((item) => item.id === memberId)
  if (!member || member.role !== "captain") {
    return null
  }
  const captain = assignedCaptain(directory, vesselId)
  if (!captain || captain.id === memberId) {
    return null
  }
  return captainTakenMessage(directory, [vesselId])
}

export function captainRoleBlock(directory: MarineFixture, memberId: string): string | null {
  const vesselIds = directory.assignments
    .filter((assignment) => assignment.memberId === memberId)
    .map((assignment) => assignment.vesselId)
    .filter((vesselId) => {
      const captain = assignedCaptain(directory, vesselId)
      return captain !== undefined && captain.id !== memberId
    })
  return captainTakenMessage(directory, vesselIds)
}

function activeVesselNames(
  directory: MarineFixture,
  memberId: string,
  exceptVesselId?: string,
): string[] {
  return directory.assignments
    .filter(
      (assignment) =>
        assignment.memberId === memberId && assignment.vesselId !== exceptVesselId,
    )
    .flatMap((assignment) => {
      const vessel = directory.vessels.find((item) => item.id === assignment.vesselId)
      return vessel?.active ? [vessel.name] : []
    })
}

export function captainActiveVesselBlock(
  directory: MarineFixture,
  memberId: string,
  vesselId: string,
): string | null {
  const member = directory.members.find((item) => item.id === memberId)
  if (!member || member.role !== "captain") {
    return null
  }
  const names = activeVesselNames(directory, memberId, vesselId)
  if (names.length === 0) {
    return null
  }
  return `${memberName(member)} is already assigned to ${listed(names)}`
}

export function vesselActivationCaptainBlock(
  directory: MarineFixture,
  vesselId: string,
): string | null {
  for (const member of directory.members) {
    if (member.role !== "captain" || !isAssigned(directory, member.id, vesselId)) {
      continue
    }
    const message = captainActiveVesselBlock(directory, member.id, vesselId)
    if (message) {
      return message
    }
  }
  return null
}

function assignedVesselNames(directory: MarineFixture, memberId: string): string[] {
  return directory.assignments
    .filter((assignment) => assignment.memberId === memberId)
    .flatMap((assignment) => {
      const vessel = directory.vessels.find((item) => item.id === assignment.vesselId)
      return vessel ? [vessel.name] : []
    })
}

function assignmentPrerequisite(
  directory: MarineFixture,
  memberId: string,
  ending: string,
): string | null {
  const member = directory.members.find((item) => item.id === memberId)
  const names = assignedVesselNames(directory, memberId)
  if (names.length === 0) {
    return null
  }
  const who = member ? memberName(member) : "This user"
  if (names.length === 1) {
    return `Remove ${who} from ${names[0]} ${ending}`
  }
  if (names.length === 2) {
    return `Remove ${who} from ${names[0]} and ${names[1]} ${ending}`
  }
  const leading = names.slice(0, -1).join(", ")
  return `Remove ${who} from ${leading}, and ${names[names.length - 1]} ${ending}`
}

export function memberDeactivateBlock(
  directory: MarineFixture,
  memberId: string,
): string | null {
  return assignmentPrerequisite(directory, memberId, "before deactivating")
}

export function memberRoleChangeBlock(
  directory: MarineFixture,
  memberId: string,
): string | null {
  return assignmentPrerequisite(directory, memberId, "before changing roles")
}

function listed(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? ""
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`
  }
  const leading = items.slice(0, -1).join(", ")
  return `${leading}, and ${items[items.length - 1]}`
}

function unresolvedCodes(orders: readonly WorkOrder[]): string[] {
  return [...orders]
    .map((order) => order.code)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
}

export function memberWorkOrderBlock(
  orders: readonly WorkOrder[],
  memberId: string,
  name: string,
): string | null {
  const pending = orders.filter(
    (order) =>
      order.status !== "done" &&
      (order.assigneeId === memberId || order.createdById === memberId),
  )
  const codes = unresolvedCodes(pending)
  if (codes.length === 0) {
    return null
  }
  return `Resolve ${listed(codes)} before deactivating ${name}`
}

export function vesselWorkOrderBlock(
  orders: readonly WorkOrder[],
  vesselId: string,
  name: string,
): string | null {
  const pending = orders.filter((order) => order.status !== "done" && order.vesselId === vesselId)
  const codes = unresolvedCodes(pending)
  if (codes.length === 0) {
    return null
  }
  return `Resolve ${listed(codes)} before deactivating ${name}`
}

export function inactiveAssignmentBlock(
  directory: MarineFixture,
  memberId: string,
): string | null {
  const member = directory.members.find((item) => item.id === memberId)
  if (member && !member.active) {
    return "Deactivated users are not assigned to vessels"
  }
  return null
}

export function adminAssignmentBlock(
  directory: MarineFixture,
  memberId: string,
): string | null {
  const member = directory.members.find((item) => item.id === memberId)
  if (member?.role === "admin") {
    return "Admins are not assigned to vessels"
  }
  return null
}

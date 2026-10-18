import type { MarineFixture, Role, Vessel } from "@/lib/session/types"

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

export type LastAdminAction =
  | { type: "deactivate-member"; memberId: string }
  | { type: "set-member-role"; memberId: string; role: Role }
  | { type: "remove-assignment"; memberId: string; vesselId: string }
  | { type: "activate-vessel"; vesselId: string }
  | { type: "deactivate-vessel"; vesselId: string }

function adminGapMessage(vessels: readonly { name: string }[]): string | null {
  const names = vessels.map((vessel) => vessel.name)
  if (names.length === 0) {
    return null
  }
  if (names.length === 1) {
    return `${names[0]} needs an active admin`
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} need an active admin`
  }
  const leading = names.slice(0, -1).join(", ")
  return `${leading}, and ${names[names.length - 1]} need an active admin`
}

function activeAdminCount(directory: MarineFixture, vesselId: string): number {
  return directory.members.filter(
    (member) =>
      member.active &&
      member.role === "admin" &&
      directory.assignments.some(
        (assignment) =>
          assignment.memberId === member.id && assignment.vesselId === vesselId,
      ),
  ).length
}

function isAssigned(
  directory: MarineFixture,
  memberId: string,
  vesselId: string,
): boolean {
  return directory.assignments.some(
    (assignment) =>
      assignment.memberId === memberId && assignment.vesselId === vesselId,
  )
}

function vesselsThatWouldLoseAdmin(
  directory: MarineFixture,
  memberId: string,
): Vessel[] {
  const member = directory.members.find((item) => item.id === memberId)
  if (!member || !member.active || member.role !== "admin") {
    return []
  }
  return directory.vessels.filter(
    (vessel) =>
      vessel.active &&
      isAssigned(directory, memberId, vessel.id) &&
      activeAdminCount(directory, vessel.id) === 1,
  )
}

export function lastAdminBlock(
  directory: MarineFixture,
  action: LastAdminAction,
): string | null {
  if (action.type === "deactivate-vessel") {
    return null
  }

  if (action.type === "activate-vessel") {
    const vessel = directory.vessels.find((item) => item.id === action.vesselId)
    if (!vessel || activeAdminCount(directory, vessel.id) > 0) {
      return null
    }
    return adminGapMessage([vessel])
  }

  if (action.type === "remove-assignment") {
    const vessel = directory.vessels.find((item) => item.id === action.vesselId)
    const member = directory.members.find((item) => item.id === action.memberId)
    if (!vessel?.active || !member?.active || member.role !== "admin") {
      return null
    }
    if (activeAdminCount(directory, vessel.id) !== 1) {
      return null
    }
    if (!isAssigned(directory, member.id, vessel.id)) {
      return null
    }
    return adminGapMessage([vessel])
  }

  if (action.type === "set-member-role" && action.role === "admin") {
    return null
  }

  return adminGapMessage(vesselsThatWouldLoseAdmin(directory, action.memberId))
}

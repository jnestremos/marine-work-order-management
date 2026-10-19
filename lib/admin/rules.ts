import { memberName, type MarineFixture, type Member } from "@/lib/session/types"

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

export function memberDeactivateBlock(
  directory: MarineFixture,
  memberId: string,
): string | null {
  const member = directory.members.find((item) => item.id === memberId)
  const names = directory.assignments
    .filter((assignment) => assignment.memberId === memberId)
    .flatMap((assignment) => {
      const vessel = directory.vessels.find((item) => item.id === assignment.vesselId)
      return vessel ? [vessel.name] : []
    })
  if (names.length === 0) {
    return null
  }
  const who = member ? memberName(member) : "This user"
  if (names.length === 1) {
    return `Remove ${who} from ${names[0]} before deactivating`
  }
  if (names.length === 2) {
    return `Remove ${who} from ${names[0]} and ${names[1]} before deactivating`
  }
  const leading = names.slice(0, -1).join(", ")
  return `Remove ${who} from ${leading}, and ${names[names.length - 1]} before deactivating`
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

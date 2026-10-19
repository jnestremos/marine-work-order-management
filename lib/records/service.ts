import type { Assignment, Role, ServiceRecord } from "@/lib/session/types"

export function todayIsoDate(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function closedEndDate(startDate: string, endDate: string) {
  return startDate > endDate ? startDate : endDate
}

export function openServiceRecord(
  records: readonly ServiceRecord[],
  input: { id: string; memberId: string; vesselId: string; role: Role; startDate: string },
): ServiceRecord[] {
  const alreadyOpen = records.some(
    (record) =>
      record.memberId === input.memberId &&
      record.vesselId === input.vesselId &&
      record.endDate === "",
  )
  if (alreadyOpen) {
    return [...records]
  }
  return [
    ...records,
    {
      id: input.id,
      memberId: input.memberId,
      vesselId: input.vesselId,
      role: input.role,
      startDate: input.startDate,
      endDate: "",
    },
  ]
}

export function closeServiceRecords(
  records: readonly ServiceRecord[],
  memberId: string,
  vesselId: string,
  endDate: string,
): ServiceRecord[] {
  return records.map((record) =>
    record.memberId === memberId && record.vesselId === vesselId && record.endDate === ""
      ? { ...record, endDate: closedEndDate(record.startDate, endDate) }
      : record,
  )
}

export function closeAssignedServiceRecords(
  records: readonly ServiceRecord[],
  assignments: readonly Assignment[],
  vesselId: string,
  endDate: string,
): ServiceRecord[] {
  const memberIds = new Set(
    assignments
      .filter((assignment) => assignment.vesselId === vesselId)
      .map((assignment) => assignment.memberId),
  )
  return records.map((record) =>
    record.vesselId === vesselId && record.endDate === "" && memberIds.has(record.memberId)
      ? { ...record, endDate: closedEndDate(record.startDate, endDate) }
      : record,
  )
}

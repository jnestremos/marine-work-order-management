"use client"

import {
  adminAssignmentBlock,
  captainActiveVesselBlock,
  captainAssignmentBlock,
  captainRoleBlock,
  duplicateAssignment,
  duplicateName,
  inactiveAssignmentBlock,
  memberDeactivateBlock,
  memberRoleChangeBlock,
  memberWorkOrderBlock,
  vesselActivationCaptainBlock,
  vesselWorkOrderBlock,
  withoutVesselAssignments,
} from "@/lib/admin/rules"
import { useSessionStore } from "@/lib/session/store"
import { useWorkOrders } from "@/components/work-orders/WorkOrderProvider"
import { memberName, type Role, type SeaService, type ServiceRecord } from "@/lib/session/types"

function replaceMemberRecords<Record extends { id: string; memberId: string }>(
  current: Record[],
  memberId: string,
  next: Record[],
) {
  return [
    ...current.filter((record) => record.memberId !== memberId),
    ...next.map((record) => ({ ...record, memberId })),
  ]
}

export function useAdminDirectory() {
  const directory = useSessionStore((state) => state.directory)
  const setDirectory = useSessionStore((state) => state.setDirectory)
  const { orders } = useWorkOrders()

  function saveUser(input: {
    id?: string
    firstName: string
    lastName: string
    role: Role
    serviceRecords: ServiceRecord[]
    seaServices: SeaService[]
  }) {
    const users = directory.members.map((member) => ({
      id: member.id,
      name: memberName(member),
    }))
    if (duplicateName(users, memberName(input), input.id)) {
      return "A user with this name already exists"
    }
    const memberId = input.id ?? crypto.randomUUID()
    const keepRecords = input.role === "captain" || input.role === "crew"
    const serviceRecords = keepRecords
      ? replaceMemberRecords(directory.serviceRecords, memberId, input.serviceRecords)
      : directory.serviceRecords
    const seaServices = keepRecords
      ? replaceMemberRecords(directory.seaServices, memberId, input.seaServices)
      : directory.seaServices
    if (input.id) {
      const existing = directory.members.find((member) => member.id === input.id)
      if (!existing) {
        return null
      }
      const nextRole = input.role
      if (nextRole !== existing.role) {
        const assignmentMessage = memberRoleChangeBlock(directory, input.id)
        if (assignmentMessage) {
          return assignmentMessage
        }
      }
      if (nextRole === "captain" && existing.role !== "captain") {
        const message = captainRoleBlock(directory, input.id)
        if (message) {
          return message
        }
      }
      setDirectory({
        ...directory,
        members: directory.members.map((member) =>
          member.id === input.id
            ? {
                ...member,
                firstName: input.firstName,
                lastName: input.lastName,
                role: nextRole,
              }
            : member,
        ),
        assignments:
          nextRole === "admin"
            ? directory.assignments.filter((assignment) => assignment.memberId !== input.id)
            : directory.assignments,
        serviceRecords,
        seaServices,
      })
      return null
    }
    setDirectory({
      ...directory,
      members: [
        ...directory.members,
        {
          id: memberId,
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
          active: true,
        },
      ],
      serviceRecords,
      seaServices,
    })
    return null
  }

  function setMemberActive(memberId: string, active: boolean) {
    if (!active) {
      const message = memberDeactivateBlock(directory, memberId)
      if (message) {
        return message
      }
      const member = directory.members.find((item) => item.id === memberId)
      const workMessage = memberWorkOrderBlock(
        orders,
        memberId,
        member ? memberName(member) : "This user",
      )
      if (workMessage) {
        return workMessage
      }
    }
    setDirectory({
      ...directory,
      members: directory.members.map((member) =>
        member.id === memberId ? { ...member, active } : member,
      ),
    })
    return null
  }

  function saveVessel(input: { id?: string; name: string }) {
    if (duplicateName(directory.vessels, input.name, input.id)) {
      return "A vessel with this name already exists"
    }
    if (input.id) {
      setDirectory({
        ...directory,
        vessels: directory.vessels.map((vessel) =>
          vessel.id === input.id ? { ...vessel, name: input.name } : vessel,
        ),
      })
      return null
    }
    setDirectory({
      ...directory,
      vessels: [
        ...directory.vessels,
        { id: crypto.randomUUID(), name: input.name, active: false },
      ],
    })
    return null
  }

  function setVesselActive(vesselId: string, active: boolean) {
    if (!active) {
      const vessel = directory.vessels.find((item) => item.id === vesselId)
      const message = vesselWorkOrderBlock(orders, vesselId, vessel?.name ?? "this vessel")
      if (message) {
        return message
      }
    } else {
      const message = vesselActivationCaptainBlock(directory, vesselId)
      if (message) {
        return message
      }
    }
    setDirectory({
      ...directory,
      vessels: directory.vessels.map((vessel) =>
        vessel.id === vesselId ? { ...vessel, active } : vessel,
      ),
      assignments: active
        ? directory.assignments
        : withoutVesselAssignments(directory.assignments, vesselId),
    })
    return null
  }

  function addAssignment(input: { memberId: string; vesselId: string }) {
    const adminMessage = adminAssignmentBlock(directory, input.memberId)
    if (adminMessage) {
      return adminMessage
    }
    const inactiveMessage = inactiveAssignmentBlock(directory, input.memberId)
    if (inactiveMessage) {
      return inactiveMessage
    }
    const captainMessage = captainAssignmentBlock(directory, input.memberId, input.vesselId)
    if (captainMessage) {
      return captainMessage
    }
    const vessel = directory.vessels.find((item) => item.id === input.vesselId)
    if (vessel?.active) {
      const activeMessage = captainActiveVesselBlock(directory, input.memberId, input.vesselId)
      if (activeMessage) {
        return activeMessage
      }
    }
    if (duplicateAssignment(directory.assignments, input.memberId, input.vesselId)) {
      return "This user is already assigned to this vessel"
    }
    setDirectory({
      ...directory,
      assignments: [
        ...directory.assignments,
        { memberId: input.memberId, vesselId: input.vesselId },
      ],
    })
    return null
  }

  function removeAssignment(memberId: string, vesselId: string) {
    setDirectory({
      ...directory,
      assignments: directory.assignments.filter(
        (assignment) => assignment.memberId !== memberId || assignment.vesselId !== vesselId,
      ),
    })
    return null
  }

  return {
    directory,
    saveUser,
    setMemberActive,
    saveVessel,
    setVesselActive,
    addAssignment,
    removeAssignment,
  }
}

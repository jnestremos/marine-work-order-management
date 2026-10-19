"use client"

import {
  adminAssignmentBlock,
  captainAssignmentBlock,
  captainRoleBlock,
  duplicateAssignment,
  duplicateName,
  inactiveAssignmentBlock,
  memberDeactivateBlock,
  withoutVesselAssignments,
} from "@/lib/admin/rules"
import { useSessionStore } from "@/lib/session/store"
import { memberName, type Role } from "@/lib/session/types"

export function useAdminDirectory() {
  const directory = useSessionStore((state) => state.directory)
  const setDirectory = useSessionStore((state) => state.setDirectory)

  function saveUser(input: {
    id?: string
    firstName: string
    lastName: string
    role: Role
  }) {
    const users = directory.members.map((member) => ({
      id: member.id,
      name: memberName(member),
    }))
    if (duplicateName(users, memberName(input), input.id)) {
      return "A user with this name already exists"
    }
    if (input.id) {
      const existing = directory.members.find((member) => member.id === input.id)
      if (!existing) {
        return null
      }
      const nextRole = input.role
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
      })
      return null
    }
    setDirectory({
      ...directory,
      members: [
        ...directory.members,
        {
          id: crypto.randomUUID(),
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
          active: true,
        },
      ],
    })
    return null
  }

  function setMemberActive(memberId: string, active: boolean) {
    if (!active) {
      const message = memberDeactivateBlock(directory, memberId)
      if (message) {
        return message
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

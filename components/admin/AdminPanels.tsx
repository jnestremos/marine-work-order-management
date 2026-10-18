"use client"

import { useState } from "react"
import { AssignmentsSection } from "@/components/admin/AssignmentsSection"
import { PeopleSection } from "@/components/admin/PeopleSection"
import { VesselsSection } from "@/components/admin/VesselsSection"
import { duplicateAssignment, duplicateName, lastAdminBlock } from "@/lib/admin/rules"
import { marineFixture } from "@/lib/fixtures/marine"
import type { MarineFixture, Role } from "@/lib/session/types"

function copyFixture(fixture: MarineFixture): MarineFixture {
  return {
    vessels: fixture.vessels.map((vessel) => ({ ...vessel })),
    members: fixture.members.map((member) => ({ ...member })),
    assignments: fixture.assignments.map((assignment) => ({ ...assignment })),
  }
}

export function AdminPanels() {
  const [directory, setDirectory] = useState(() => copyFixture(marineFixture))

  function savePerson(input: { id?: string; name: string; role: Role }) {
    if (duplicateName(directory.members, input.name, input.id)) {
      return "A person with this name already exists"
    }
    if (input.id) {
      const existing = directory.members.find((member) => member.id === input.id)
      if (!existing) {
        return null
      }
      if (input.role !== existing.role) {
        const message = lastAdminBlock(directory, {
          type: "set-member-role",
          memberId: input.id,
          role: input.role,
        })
        if (message) {
          return message
        }
      }
      setDirectory({
        ...directory,
        members: directory.members.map((member) =>
          member.id === input.id
            ? { ...member, name: input.name, role: input.role }
            : member,
        ),
      })
      return null
    }
    setDirectory({
      ...directory,
      members: [
        ...directory.members,
        {
          id: crypto.randomUUID(),
          name: input.name,
          role: input.role,
          active: true,
        },
      ],
    })
    return null
  }

  function setMemberActive(memberId: string, active: boolean) {
    if (!active) {
      const message = lastAdminBlock(directory, {
        type: "deactivate-member",
        memberId,
      })
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
    const message = lastAdminBlock(directory, {
      type: active ? "activate-vessel" : "deactivate-vessel",
      vesselId,
    })
    if (message) {
      return message
    }
    setDirectory({
      ...directory,
      vessels: directory.vessels.map((vessel) =>
        vessel.id === vesselId ? { ...vessel, active } : vessel,
      ),
    })
    return null
  }

  function addAssignment(input: { memberId: string; vesselId: string }) {
    if (duplicateAssignment(directory.assignments, input.memberId, input.vesselId)) {
      return "This person is already assigned to this vessel"
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
    const message = lastAdminBlock(directory, {
      type: "remove-assignment",
      memberId,
      vesselId,
    })
    if (message) {
      return message
    }
    setDirectory({
      ...directory,
      assignments: directory.assignments.filter(
        (assignment) =>
          assignment.memberId !== memberId || assignment.vesselId !== vesselId,
      ),
    })
    return null
  }

  return (
    <div className="mt-8 flex flex-col gap-10">
      <PeopleSection
        members={directory.members}
        onSave={savePerson}
        onSetActive={setMemberActive}
      />
      <VesselsSection
        vessels={directory.vessels}
        onSave={saveVessel}
        onSetActive={setVesselActive}
      />
      <AssignmentsSection
        members={directory.members}
        vessels={directory.vessels}
        assignments={directory.assignments}
        onAdd={addAssignment}
        onRemove={removeAssignment}
      />
    </div>
  )
}

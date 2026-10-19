"use client"

import { AssignmentsSection } from "@/components/admin/AssignmentsSection"
import { useAdminDirectory } from "@/components/admin/useAdminDirectory"
import { UsersSection } from "@/components/admin/UsersSection"
import { VesselsSection } from "@/components/admin/VesselsSection"

export function AdminUsersPage() {
  const { directory, saveUser, setMemberActive } = useAdminDirectory()
  return (
    <UsersSection
      members={directory.members}
      vessels={directory.vessels}
      assignments={directory.assignments}
      onSave={saveUser}
      onSetActive={setMemberActive}
    />
  )
}

export function AdminVesselsPage() {
  const { directory, saveVessel, setVesselActive } = useAdminDirectory()
  return (
    <VesselsSection
      vessels={directory.vessels}
      members={directory.members}
      assignments={directory.assignments}
      onSave={saveVessel}
      onSetActive={setVesselActive}
    />
  )
}

export function AdminAssignmentsPage() {
  const { directory, addAssignment, removeAssignment } = useAdminDirectory()
  return (
    <AssignmentsSection
      members={directory.members}
      vessels={directory.vessels}
      assignments={directory.assignments}
      onAdd={addAssignment}
      onRemove={removeAssignment}
    />
  )
}

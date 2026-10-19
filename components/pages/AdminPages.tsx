"use client"

import { AssignmentsSection } from "@/components/admin/AssignmentsSection"
import {
  AdminQueryGate,
  useAdminAssignmentsData,
  useAdminUsersData,
  useAdminVesselsData,
} from "@/components/admin/useAdminDirectory"
import { UsersSection } from "@/components/admin/UsersSection"
import { VesselsSection } from "@/components/admin/VesselsSection"

export function AdminUsersPage() {
  const data = useAdminUsersData()
  return (
    <AdminQueryGate isLoading={data.isLoading} error={data.error}>
      <UsersSection
        members={data.members}
        vessels={data.vessels}
        serviceRecords={data.serviceRecords}
        onSave={data.saveUser}
        onSetActive={data.setMemberActive}
      />
    </AdminQueryGate>
  )
}

export function AdminVesselsPage() {
  const data = useAdminVesselsData()
  return (
    <AdminQueryGate isLoading={data.isLoading} error={data.error}>
      <VesselsSection
        vessels={data.vessels}
        members={data.members}
        assignments={data.assignments}
        onSave={data.saveVessel}
        onSetActive={data.setVesselActive}
        onRemoveAssignment={data.removeAssignment}
      />
    </AdminQueryGate>
  )
}

export function AdminAssignmentsPage() {
  const data = useAdminAssignmentsData()
  return (
    <AdminQueryGate isLoading={data.isLoading} error={data.error}>
      <AssignmentsSection
        members={data.members}
        vessels={data.vessels}
        assignments={data.assignments}
        onAdd={data.addAssignment}
        onRemove={data.removeAssignment}
      />
    </AdminQueryGate>
  )
}

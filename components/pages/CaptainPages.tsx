"use client"

import { CaptainWorkspace } from "@/components/captain/CaptainWorkspace"
import { DataTable } from "@/components/admin/DataTable"
import { RecordStatus } from "@/components/admin/RecordStatus"
import { EmptyRole } from "@/components/views/EmptyRole"
import { useSessionStore } from "@/lib/session/store"
import { memberName } from "@/lib/session/types"

export function CaptainWorkOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Work orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create work orders for your vessel.</p>
      </div>
      <CaptainWorkspace />
    </div>
  )
}

export function CaptainCrewPage() {
  const memberId = useSessionStore((state) => state.memberId)
  const directory = useSessionStore((state) => state.directory)
  const member = directory.members.find((item) => item.id === memberId)
  const vessel = directory.vessels.find(
    (item) =>
      item.active &&
      directory.assignments.some(
        (assignment) => assignment.memberId === memberId && assignment.vesselId === item.id,
      ),
  )
  const crew = vessel
    ? directory.members.filter(
        (item) =>
          item.role === "crew" &&
          directory.assignments.some(
            (assignment) =>
              assignment.memberId === item.id && assignment.vesselId === vessel.id,
          ),
      )
    : []

  if (!member) {
    return <EmptyRole />
  }

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h1 className="text-base font-semibold">Crew assignments</h1>
        <p className="text-sm text-muted-foreground">
          {vessel ? vessel.name : "No vessel assigned"}
        </p>
      </div>
      <DataTable
        minWidth="min-w-[32rem]"
        empty={vessel ? "No crew assigned." : "No vessel assigned."}
        rows={crew}
        getRowKey={(item) => item.id}
        columns={[
          {
            header: "Name",
            cellClassName: "font-medium",
            value: (item) => memberName(item),
            cell: (item) => memberName(item),
          },
          {
            header: "Status",
            width: "w-32",
            value: (item) => (item.active ? "Active" : "Inactive"),
            cell: (item) => <RecordStatus active={item.active} />,
          },
        ]}
      />
    </section>
  )
}

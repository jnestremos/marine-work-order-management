"use client"

import { CaptainWorkspace } from "@/components/captain/CaptainWorkspace"
import { DataTable } from "@/components/admin/DataTable"
import { QueryState } from "@/components/data/QueryState"
import { useMembersQuery, useVesselsQuery } from "@/components/data/marine-queries"
import { Badge } from "@/components/ui/badge"
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
  const sessionVesselId = useSessionStore((state) => state.vesselId)
  const members = useMembersQuery()
  const vessels = useVesselsQuery()
  const member = (members.data ?? []).find((item) => item.id === memberId)
  const vessel = (vessels.data ?? []).find(
    (item) => item.id === sessionVesselId && item.active,
  )
  const crew = (members.data ?? []).filter((item) => item.role === "crew" && item.active)

  return (
    <QueryState
      isLoading={members.isLoading || vessels.isLoading}
      error={members.error ?? vessels.error}
    >
      {!member ? (
        <EmptyRole />
      ) : (
        <section className="min-w-0 max-w-full rounded-xl border bg-card max-md:overflow-x-auto">
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
                cell: (item) => (
                  <Badge variant={item.active ? "active" : "inactive"}>
                    {item.active ? "Active" : "Inactive"}
                  </Badge>
                ),
              },
            ]}
          />
        </section>
      )}
    </QueryState>
  )
}

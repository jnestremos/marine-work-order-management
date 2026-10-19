"use client"

import { DataTable } from "@/components/admin/DataTable"
import { Badge } from "@/components/ui/badge"
import { RecordStatus } from "@/components/admin/RecordStatus"
import { EmptyRole } from "@/components/views/EmptyRole"
import { useSessionStore } from "@/lib/session/store"
import { useWorkOrders } from "@/components/work-orders/WorkOrderProvider"
import { WORK_ORDER_STATUS_LABELS } from "@/lib/work-orders/types"

export function CrewWorkOrdersPage() {
  const memberId = useSessionStore((state) => state.memberId)
  const directory = useSessionStore((state) => state.directory)
  const member = directory.members.find((item) => item.id === memberId)
  const { orders } = useWorkOrders()
  const mine = orders
    .filter((order) => order.assigneeId === memberId)
    .sort((left, right) => right.code.localeCompare(left.code, undefined, { numeric: true }))

  if (!member) {
    return <EmptyRole />
  }

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h1 className="text-base font-semibold">Work orders</h1>
        <p className="text-sm text-muted-foreground">
          {mine.length} {mine.length === 1 ? "work order" : "work orders"}
        </p>
      </div>
      <DataTable
        minWidth="min-w-[48rem]"
        empty="No work orders yet."
        rows={mine}
        getRowKey={(order) => order.id}
        columns={[
          {
            header: "Work order",
            width: "w-32",
            value: (order) => order.code,
            cell: (order) => order.code,
          },
          {
            header: "Vessel",
            width: "w-40",
            value: (order) =>
              directory.vessels.find((vessel) => vessel.id === order.vesselId)?.name ?? "",
            cell: (order) =>
              directory.vessels.find((vessel) => vessel.id === order.vesselId)?.name ?? "",
          },
          {
            header: "Title",
            value: (order) => order.title,
            cell: (order) => order.title,
          },
          {
            header: "Issue",
            value: (order) => order.issue,
            cell: (order) => order.issue,
          },
          {
            header: "Status",
            width: "w-32",
            value: (order) => WORK_ORDER_STATUS_LABELS[order.status],
            cell: (order) => (
              <Badge variant="secondary">{WORK_ORDER_STATUS_LABELS[order.status]}</Badge>
            ),
          },
        ]}
      />
    </section>
  )
}

export function CrewVesselsPage() {
  const memberId = useSessionStore((state) => state.memberId)
  const directory = useSessionStore((state) => state.directory)
  const member = directory.members.find((item) => item.id === memberId)
  const vessels = directory.assignments.flatMap((assignment) => {
    if (assignment.memberId !== memberId) {
      return []
    }
    const vessel = directory.vessels.find((item) => item.id === assignment.vesselId)
    return vessel ? [vessel] : []
  })

  if (!member) {
    return <EmptyRole />
  }

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h1 className="text-base font-semibold">Vessel assignments</h1>
        <p className="text-sm text-muted-foreground">
          {vessels.length} {vessels.length === 1 ? "vessel" : "vessels"}
        </p>
      </div>
      <DataTable
        minWidth="min-w-[32rem]"
        empty="No vessel assigned."
        rows={vessels}
        getRowKey={(vessel) => vessel.id}
        columns={[
          {
            header: "Vessel",
            cellClassName: "font-medium",
            value: (vessel) => vessel.name,
            cell: (vessel) => vessel.name,
          },
          {
            header: "Status",
            width: "w-32",
            value: (vessel) => (vessel.active ? "Active" : "Inactive"),
            cell: (vessel) => <RecordStatus active={vessel.active} />,
          },
        ]}
      />
    </section>
  )
}

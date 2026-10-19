"use client"

import { useState } from "react"
import { DataTable, DataTableActions, type DataTableAction } from "@/components/admin/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WorkOrderDialog } from "@/components/work-orders/WorkOrderDialog"
import { useWorkOrders } from "@/components/work-orders/WorkOrderProvider"
import { marineFixture } from "@/lib/fixtures/marine"
import type { WorkOrderFormValues } from "@/lib/work-orders/schema"
import {
  captainVessels,
  eligibleCrew,
  workOrdersForCaptain,
} from "@/lib/work-orders/rules"
import { WORK_ORDER_STATUS_LABELS, type WorkOrder } from "@/lib/work-orders/types"
import { useSessionStore } from "@/lib/session/store"
import { memberName } from "@/lib/session/types"

export function CaptainWorkspace() {
  const memberId = useSessionStore((state) => state.memberId)
  const sessionVesselId = useSessionStore((state) => state.vesselId)
  const { orders, addWorkOrder, updateWorkOrder, reviewWorkOrder } = useWorkOrders()
  const vessels = captainVessels(marineFixture, memberId ?? "")
  const selected =
    vessels.find((vessel) => vessel.id === sessionVesselId) ?? vessels[0] ?? null

  if (!selected) {
    return <p className="text-sm text-muted-foreground">No vessel assigned.</p>
  }

  return (
    <VesselOrders
      key={`${memberId ?? ""}:${selected.id}`}
      vesselId={selected.id}
      vesselName={selected.name}
      captainId={memberId ?? ""}
      orders={workOrdersForCaptain(orders, selected.id, memberId ?? "")}
      onCreate={addWorkOrder}
      onUpdate={updateWorkOrder}
      onReview={reviewWorkOrder}
    />
  )
}

function VesselOrders({
  vesselId,
  vesselName,
  captainId,
  orders,
  onCreate,
  onUpdate,
  onReview,
}: {
  vesselId: string
  vesselName: string
  captainId: string
  orders: ReturnType<typeof workOrdersForCaptain>
  onCreate: (input: {
    vesselId: string
    title: string
    issue: string
    assigneeId: string
    createdById: string
  }) => string | null
  onUpdate: (id: string, input: { title: string; issue: string; assigneeId: string }) => string | null
  onReview: (id: string, status: "accepted" | "rejected") => void
}) {
  const crew = eligibleCrew(marineFixture, vesselId).map((member) => ({
    id: member.id,
    name: memberName(member),
  }))
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = orders.find((order) => order.id === editingId) ?? null
  const crewLocked = editing?.status === "done"
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const visible = normalizedQuery
    ? orders.filter((order) => order.title.toLowerCase().includes(normalizedQuery))
    : orders

  function closeModal() {
    setOpen(false)
    setEditingId(null)
  }

  function openEdit(order: WorkOrder) {
    setEditingId(order.id)
    setFormKey((value) => value + 1)
    setOpen(true)
  }

  function submitWorkOrder(values: WorkOrderFormValues) {
    return editing
      ? onUpdate(editing.id, {
          ...values,
          assigneeId: crewLocked ? editing.assigneeId : values.assigneeId,
        })
      : onCreate({
          vesselId,
          title: values.title,
          issue: values.issue,
          assigneeId: values.assigneeId,
          createdById: captainId,
        })
  }

  return (
    <section className="min-w-0 max-w-full rounded-lg border max-md:overflow-x-auto">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b px-4 py-3 md:flex md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">{vesselName}</h2>
          <p className="text-sm text-muted-foreground">
            {orders.length} {orders.length === 1 ? "work order" : "work orders"}
          </p>
        </div>
        <Button
          type="button"
          className="md:order-last"
          onClick={() => {
            setEditingId(null)
            setFormKey((value) => value + 1)
            setOpen(true)
          }}
        >
          Add work order
        </Button>
        <div className="col-span-2 md:col-auto">
          <Label htmlFor="work-order-search" className="sr-only">
            Search
          </Label>
          <Input
            id="work-order-search"
            value={query}
            placeholder="Search title"
            className="w-full md:w-56"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <DataTable
        minWidth="min-w-[64rem]"
        empty={normalizedQuery ? "No matching work orders." : "No work orders yet."}
        rows={visible}
        getRowKey={(order) => order.id}
        columns={[
          {
            header: "Work order",
            width: "w-32",
            value: (order) => order.code,
            cell: (order) => order.code,
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
            header: "Crew",
            width: "w-40",
            value: (order) => {
              const member = marineFixture.members.find((item) => item.id === order.assigneeId)
              return member ? memberName(member) : ""
            },
            cell: (order) => {
              const member = marineFixture.members.find((item) => item.id === order.assigneeId)
              return member ? memberName(member) : ""
            },
          },
          {
            header: "Status",
            width: "w-32",
            value: (order) => WORK_ORDER_STATUS_LABELS[order.status],
            cell: (order) => (
              <Badge variant={order.status}>{WORK_ORDER_STATUS_LABELS[order.status]}</Badge>
            ),
          },
          {
            header: "Actions",
            width: "w-80",
            align: "center",
            cell: (order) => {
              const actions: DataTableAction[] = [
                { label: "View", onClick: () => openEdit(order) },
              ]
              if (order.status === "done") {
                actions.push(
                  {
                    label: "Accept",
                    variant: "success",
                    onClick: () => onReview(order.id, "accepted"),
                  },
                  {
                    label: "Reject",
                    variant: "destructive",
                    onClick: () => onReview(order.id, "rejected"),
                  },
                )
              }
              return <DataTableActions inline actions={actions} />
            },
          },
        ]}
      />
      <WorkOrderDialog
        key={formKey}
        open={open}
        order={editing}
        description={
          crewLocked
            ? "Update the title and issue. The assigned crew member stays as it is."
            : editing
              ? "Update the title, issue, and crew member."
              : "Enter a title, an issue, and a crew member."
        }
        showCrew
        showSolution={crewLocked}
        crew={crew}
        crewLocked={crewLocked}
        submitLabel={editing ? "Save work order" : "Add work order"}
        onSubmit={submitWorkOrder}
        onOpenChange={(next) => {
          if (!next) {
            closeModal()
          }
        }}
      />
    </section>
  )
}

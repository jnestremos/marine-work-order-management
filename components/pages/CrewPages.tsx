"use client"

import { useState, type FormEvent } from "react"
import { HistoryIcon } from "lucide-react"
import { DataTable, DataTableActions } from "@/components/admin/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmptyRole } from "@/components/views/EmptyRole"
import { useSessionStore } from "@/lib/session/store"
import { SolutionHistoryDialog } from "@/components/work-orders/SolutionHistory"
import { WorkOrderDialog } from "@/components/work-orders/WorkOrderDialog"
import { useWorkOrders } from "@/components/work-orders/WorkOrderProvider"
import { solutionSubmitBlock } from "@/lib/work-orders/solutions"
import { WORK_ORDER_STATUS_LABELS, type WorkOrder } from "@/lib/work-orders/types"

export function CrewWorkOrdersPage() {
  const memberId = useSessionStore((state) => state.memberId)
  const directory = useSessionStore((state) => state.directory)
  const member = directory.members.find((item) => item.id === memberId)
  const { orders, submitSolution } = useWorkOrders()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const mine = orders
    .filter((order) => order.assigneeId === memberId)
    .sort((left, right) => right.code.localeCompare(left.code, undefined, { numeric: true }))
  const selected = mine.find((order) => order.id === selectedId) ?? null
  const viewing = mine.find((order) => order.id === viewId) ?? null
  const history = mine.find((order) => order.id === historyId) ?? null

  function openView(order: WorkOrder) {
    setViewId(order.id)
  }

  function closeView() {
    setViewId(null)
  }

  function openSolutions(order: WorkOrder) {
    setSelectedId(order.id)
    setDraft("")
    setError(null)
  }

  function closeSolutions() {
    setSelectedId(null)
    setHistoryId(null)
    setDraft("")
    setError(null)
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !memberId) {
      return
    }
    const message = submitSolution(selected.id, memberId, draft)
    setError(message)
    if (!message) {
      closeSolutions()
    }
  }

  if (!member) {
    return <EmptyRole />
  }

  return (
    <section className="min-w-0 max-w-full rounded-xl border bg-card max-md:overflow-x-auto">
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
              <Badge variant={order.status}>{WORK_ORDER_STATUS_LABELS[order.status]}</Badge>
            ),
          },
          {
            header: "Actions",
            width: "w-72",
            align: "center",
            cell: (order) => (
              <DataTableActions
                inline
                actions={[
                  { label: "View", onClick: () => openView(order) },
                  ...(solutionSubmitBlock(order)
                    ? []
                    : [{ label: "Resolve", onClick: () => openSolutions(order) }]),
                ]}
              />
            ),
          },
        ]}
      />
      <WorkOrderDialog
        open={viewing !== null}
        order={viewing}
        description={
          viewing
            ? `${viewing.code} · ${
                directory.vessels.find((vessel) => vessel.id === viewing.vesselId)?.name ?? ""
              }`
            : "Work order details."
        }
        readOnly
        showStatus
        showSolution
        onOpenChange={(next) => {
          if (!next) {
            closeView()
          }
        }}
      />
      <Dialog
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) {
            closeSolutions()
          }
        }}
      >
        <DialogContent className="min-w-0 overflow-x-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selected ? `Send solution for ${selected.code}` : "Send solution"}
            </DialogTitle>
            <DialogDescription>
              Send one solution. You can send another after this one is rejected.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="crew-solution">Solution</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Solution history"
                    onClick={() => setHistoryId(selected.id)}
                  >
                    <HistoryIcon />
                  </Button>
                </div>
                <form id="crew-solution-form" onSubmit={send}>
                  <Textarea
                    id="crew-solution"
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value)
                      setError(null)
                    }}
                  />
                </form>
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeSolutions}>
              Close
            </Button>
            <Button type="submit" form="crew-solution-form">
              Send solution
            </Button>
          </DialogFooter>
          <SolutionHistoryDialog
            code={history?.code ?? ""}
            title={history?.title ?? ""}
            solutions={history?.solutions ?? []}
            open={selected !== null && history?.id === selected.id}
            onOpenChange={(next) => {
              if (!next) {
                setHistoryId(null)
              }
            }}
          />
        </DialogContent>
      </Dialog>
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
    <section className="min-w-0 max-w-full rounded-xl border bg-card max-md:overflow-x-auto">
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
            cell: (vessel) => (
              <Badge variant={vessel.active ? "active" : "inactive"}>
                {vessel.active ? "Active" : "Inactive"}
              </Badge>
            ),
          },
        ]}
      />
    </section>
  )
}

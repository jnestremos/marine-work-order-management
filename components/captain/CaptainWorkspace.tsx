"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { DataTable, DataTableActions, type DataTableAction } from "@/components/admin/DataTable"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SolutionHistory } from "@/components/work-orders/SolutionHistory"
import { useWorkOrders } from "@/components/work-orders/WorkOrderProvider"
import { latestSolution } from "@/lib/work-orders/solutions"
import { marineFixture } from "@/lib/fixtures/marine"
import { workOrderFormSchema, type WorkOrderFormValues } from "@/lib/work-orders/schema"
import {
  captainVessels,
  eligibleCrew,
  workOrdersForCaptain,
} from "@/lib/work-orders/rules"
import { WORK_ORDER_STATUS_LABELS, type WorkOrder, type WorkOrderStatus } from "@/lib/work-orders/types"
import { useSessionStore } from "@/lib/session/store"
import { memberName } from "@/lib/session/types"

const statusClassName: Partial<Record<WorkOrderStatus, string>> = {
  accepted: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
}

function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <Badge variant="secondary" className={statusClassName[status]}>
      {WORK_ORDER_STATUS_LABELS[status]}
    </Badge>
  )
}

const emptyWorkOrderForm: WorkOrderFormValues = {
  title: "",
  issue: "",
  assigneeId: "",
}

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
  const crew = eligibleCrew(marineFixture, vesselId)
  const crewItems = Object.fromEntries(crew.map((member) => [member.id, memberName(member)]))
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = orders.find((order) => order.id === editingId) ?? null
  const crewLocked = editing?.status === "done"
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const visible = normalizedQuery
    ? orders.filter((order) => order.title.toLowerCase().includes(normalizedQuery))
    : orders
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: emptyWorkOrderForm,
  })

  function closeModal() {
    setOpen(false)
    setEditingId(null)
    reset(emptyWorkOrderForm)
    clearErrors()
  }

  function openEdit(order: WorkOrder) {
    setEditingId(order.id)
    reset({
      title: order.title,
      issue: order.issue,
      assigneeId: order.assigneeId,
    })
    clearErrors()
    setOpen(true)
  }

  function onValid(values: WorkOrderFormValues) {
    const message = editing
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
    if (message) {
      setError("root", { message })
      return
    }
    closeModal()
  }

  function onInvalid() {
    clearErrors("root")
    if (crew.length === 0) {
      clearErrors("assigneeId")
      setError("root", { message: "This vessel has no active crew" })
    }
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
            reset(emptyWorkOrderForm)
            clearErrors()
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
            cell: (order) => <WorkOrderStatusBadge status={order.status} />,
          },
          {
            header: "Actions",
            width: "w-80",
            align: "center",
            cell: (order) => {
              const actions: DataTableAction[] = [
                { label: "Edit", onClick: () => openEdit(order) },
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
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            closeModal()
            return
          }
          setOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit work order" : "Add work order"}</DialogTitle>
            <DialogDescription>
              {crewLocked
                ? "Update the title and issue. The assigned crew member stays as it is."
                : editing
                  ? "Update the title, issue, and crew member."
                  : "Enter a title, an issue, and a crew member."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="work-order-form"
            onSubmit={handleSubmit(onValid, onInvalid)}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="work-order-title">Title</Label>
              <Input
                id="work-order-title"
                aria-invalid={errors.title !== undefined}
                {...register("title")}
              />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="work-order-issue">Issue</Label>
              <Textarea
                id="work-order-issue"
                aria-invalid={errors.issue !== undefined}
                {...register("issue")}
              />
              {errors.issue ? (
                <p className="text-sm text-destructive">{errors.issue.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="work-order-crew">Crew</Label>
              <Controller
                name="assigneeId"
                control={control}
                render={({ field }) => (
                  <Select
                    items={crewItems}
                    value={field.value ? field.value : null}
                    disabled={crewLocked}
                    onValueChange={(value) => {
                      if (crewLocked || value === null) {
                        return
                      }
                      field.onChange(value)
                    }}
                  >
                    <SelectTrigger id="work-order-crew" className="w-full" disabled={crewLocked}>
                      <SelectValue placeholder="Select a crew member" />
                    </SelectTrigger>
                    <SelectContent>
                      {crew.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {memberName(member)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assigneeId ? (
                <p className="text-sm text-destructive">{errors.assigneeId.message}</p>
              ) : null}
            </div>
            {crewLocked ? (
              <div className="flex flex-col gap-1">
                <Label htmlFor="work-order-solution">Solution</Label>
                <Textarea
                  id="work-order-solution"
                  value={latestSolution(editing)?.text ?? ""}
                  disabled
                />
              </div>
            ) : null}
            {editing && editing.solutions.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Solution history</p>
                <SolutionHistory solutions={editing.solutions} />
              </div>
            ) : null}
            {errors.root?.message ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.root.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? "Save work order" : "Add work order"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

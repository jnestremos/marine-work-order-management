"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { DataTable } from "@/components/admin/DataTable"
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
import { useWorkOrders } from "@/components/work-orders/WorkOrderProvider"
import { marineFixture } from "@/lib/fixtures/marine"
import { workOrderFormSchema, type WorkOrderFormValues } from "@/lib/work-orders/schema"
import {
  captainVessels,
  eligibleCrew,
  workOrdersForCaptain,
} from "@/lib/work-orders/rules"
import { WORK_ORDER_STATUS_LABELS } from "@/lib/work-orders/types"
import { useSessionStore } from "@/lib/session/store"
import { memberName } from "@/lib/session/types"

const emptyWorkOrderForm: WorkOrderFormValues = {
  title: "",
  issue: "",
  assigneeId: "",
}

export function CaptainWorkspace() {
  const memberId = useSessionStore((state) => state.memberId)
  const sessionVesselId = useSessionStore((state) => state.vesselId)
  const { orders, addWorkOrder } = useWorkOrders()
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
    />
  )
}

function VesselOrders({
  vesselId,
  vesselName,
  captainId,
  orders,
  onCreate,
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
}) {
  const crew = eligibleCrew(marineFixture, vesselId)
  const crewItems = Object.fromEntries(crew.map((member) => [member.id, memberName(member)]))
  const [open, setOpen] = useState(false)
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
    reset(emptyWorkOrderForm)
    clearErrors()
  }

  function onValid(values: WorkOrderFormValues) {
    const message = onCreate({
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
    <section className="rounded-lg border">
      <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">{vesselName}</h2>
          <p className="text-sm text-muted-foreground">
            {orders.length} {orders.length === 1 ? "work order" : "work orders"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="work-order-search" className="sr-only">
            Search
          </Label>
          <Input
            id="work-order-search"
            value={query}
            placeholder="Search title"
            className="w-56"
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="button" onClick={() => setOpen(true)}>
            Add work order
          </Button>
        </div>
      </div>
      <DataTable
        minWidth="min-w-[52rem]"
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
              <Badge variant="secondary">{WORK_ORDER_STATUS_LABELS[order.status]}</Badge>
            ),
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
            <DialogTitle>Add work order</DialogTitle>
            <DialogDescription>Enter a title, an issue, and a crew member.</DialogDescription>
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
                    onValueChange={(value) => {
                      if (value !== null) {
                        field.onChange(value)
                      }
                    }}
                  >
                    <SelectTrigger id="work-order-crew" className="w-full">
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
            {errors.root?.message ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.root.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit">Add work order</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

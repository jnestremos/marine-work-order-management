"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { DataTable, DataTableActions } from "@/components/admin/DataTable"
import { RecordStatus } from "@/components/admin/RecordStatus"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  vesselActivationCaptainBlock,
  vesselAssignmentSummary,
  vesselWorkOrderBlock,
} from "@/lib/admin/rules"
import { vesselFormSchema, type VesselFormValues } from "@/lib/admin/schema"
import { memberName, ROLE_LABELS, type Assignment, type MarineFixture, type Member, type Vessel } from "@/lib/session/types"
import type { WorkOrder } from "@/lib/work-orders/types"

const emptyVesselForm: VesselFormValues = { name: "" }

export function VesselsSection({
  vessels,
  members,
  assignments,
  orders,
  onSave,
  onSetActive,
  onRemoveAssignment,
}: {
  vessels: Vessel[]
  members: Member[]
  assignments: Assignment[]
  orders: WorkOrder[]
  onSave: (input: { id?: string; name: string }) => string | null
  onSetActive: (vesselId: string, active: boolean) => string | null
  onRemoveAssignment: (memberId: string, vesselId: string) => string | null
}) {
  const directory: MarineFixture = {
    vessels,
    members,
    assignments,
    serviceRecords: [],
    seaServices: [],
  }
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, setPending] = useState<{
    title: string
    description: string
    confirmLabel: string
    run: () => void
  } | null>(null)
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const visibleVessels = normalizedQuery
    ? vessels.filter((vessel) => vessel.name.toLowerCase().includes(normalizedQuery))
    : vessels
  const vesselAssignments = editingId
    ? assignments
        .filter((assignment) => assignment.vesselId === editingId)
        .sort((left, right) => {
          const leftMember = members.find((member) => member.id === left.memberId)
          const rightMember = members.find((member) => member.id === right.memberId)
          const leftName = leftMember ? memberName(leftMember) : ""
          const rightName = rightMember ? memberName(rightMember) : ""
          return leftName.localeCompare(rightName)
        })
    : []
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<VesselFormValues>({
    resolver: zodResolver(vesselFormSchema),
    defaultValues: emptyVesselForm,
  })

  function closeModal() {
    setOpen(false)
    setEditingId(null)
    reset(emptyVesselForm)
  }

  function openAdd() {
    setEditingId(null)
    reset(emptyVesselForm)
    setOpen(true)
  }

  function openEdit(vessel: Vessel) {
    setEditingId(vessel.id)
    reset({ name: vessel.name })
    setOpen(true)
  }

  function onValid(values: VesselFormValues) {
    const message = onSave({ id: editingId ?? undefined, name: values.name })
    if (message) {
      setError("root", { message })
      return
    }
    closeModal()
  }

  function confirmDialog() {
    return (
      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        confirmLabel={pending?.confirmLabel ?? "Confirm"}
        onOpenChange={(next) => {
          if (!next) {
            setPending(null)
          }
        }}
        onConfirm={() => {
          const current = pending
          setPending(null)
          current?.run()
        }}
      />
    )
  }

  return (
    <section className="min-w-0 max-w-full rounded-xl border bg-card max-md:overflow-x-auto">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b px-4 py-3 md:flex md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Vessels</h2>
          <p className="text-sm text-muted-foreground">
            {vessels.length} {vessels.length === 1 ? "vessel" : "vessels"}
          </p>
        </div>
        <Button type="button" className="md:order-last" onClick={openAdd}>
          Add vessel
        </Button>
        <div className="col-span-2 md:col-auto">
          <Label htmlFor="vessel-search" className="sr-only">
            Search
          </Label>
          <Input
            id="vessel-search"
            value={query}
            placeholder="Search name"
            className="w-full md:w-56"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      {actionError ? (
        <p role="alert" className="border-b px-4 py-3 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
      <DataTable
        minWidth="min-w-[36rem]"
        empty={normalizedQuery ? "No matching vessels." : "No vessels yet."}
        rows={visibleVessels}
        getRowKey={(vessel) => vessel.id}
        isSelected={(vessel) => open && vessel.id === editingId}
        columns={[
          {
            header: "Name",
            cellClassName: "font-medium",
            value: (vessel) => vessel.name,
            cell: (vessel) => (
              <div>
                <div>{vessel.name}</div>
                <p className="text-sm font-normal text-muted-foreground">
                  {vesselAssignmentSummary(directory, vessel.id)}
                </p>
              </div>
            ),
          },
          {
            header: "Status",
            width: "w-32",
            value: (vessel) => (vessel.active ? "Active" : "Inactive"),
            cell: (vessel) => <RecordStatus active={vessel.active} />,
          },
          {
            header: "Actions",
            width: "w-64",
            align: "center",
            cell: (vessel) => (
              <DataTableActions
                actions={[
                  {
                    label: "Edit",
                    onClick: () => openEdit(vessel),
                  },
                  {
                    label: vessel.active ? "Deactivate" : "Activate",
                    variant: vessel.active ? "destructive" : "success",
                    onClick: () => {
                      const nextActive = !vessel.active
                      if (!nextActive) {
                        const message = vesselWorkOrderBlock(orders, vessel.id, vessel.name)
                        if (message) {
                          setActionError(message)
                          return
                        }
                      } else {
                        const message = vesselActivationCaptainBlock(directory, vessel.id)
                        if (message) {
                          setActionError(message)
                          return
                        }
                      }
                      setActionError(null)
                      setPending({
                        title: nextActive ? "Activate vessel" : "Deactivate vessel",
                        description: nextActive
                          ? `Activate ${vessel.name}?`
                          : `Deactivate ${vessel.name}? Every assignment on this vessel will be removed.`,
                        confirmLabel: nextActive ? "Activate" : "Deactivate",
                        run: () => setActionError(onSetActive(vessel.id, nextActive)),
                      })
                    },
                  },
                ]}
              />
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
        <DialogContent
          className={
            editingId
              ? "max-h-[calc(100dvh-2rem)] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-[min(40rem,calc(100%-2rem))]"
              : "sm:max-w-md"
          }
        >
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit vessel" : "Add vessel"}</DialogTitle>
            <DialogDescription>Enter the vessel name.</DialogDescription>
          </DialogHeader>
          <form
            id="vessel-form"
            onSubmit={handleSubmit(onValid, () => clearErrors("root"))}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="vessel-name">Name</Label>
              <Input
                id="vessel-name"
                aria-invalid={errors.name !== undefined}
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              ) : null}
            </div>
            {errors.root?.message ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.root.message}
              </p>
            ) : null}
          </form>
          {editingId ? (
            <div className="flex min-w-0 flex-col gap-2">
              <div>
                <h3 className="font-medium">Crew assignments</h3>
                <p className="text-sm text-muted-foreground">
                  {vesselAssignments.length}{" "}
                  {vesselAssignments.length === 1 ? "assignment" : "assignments"} on this vessel.
                </p>
              </div>
              <DataTable
                minWidth="min-w-[28rem]"
                containerClassName="h-48 min-w-0 max-w-full overflow-auto rounded-lg border"
                empty="No crew assigned to this vessel."
                rows={vesselAssignments}
                getRowKey={(assignment) => `${assignment.memberId}:${assignment.vesselId}`}
                columns={[
                  {
                    header: "User",
                    cellClassName: "font-medium",
                    value: (assignment) => {
                      const member = members.find((item) => item.id === assignment.memberId)
                      return member ? memberName(member) : ""
                    },
                    cell: (assignment) => {
                      const member = members.find((item) => item.id === assignment.memberId)
                      return member ? memberName(member) : ""
                    },
                  },
                  {
                    header: "Role",
                    width: "w-32",
                    value: (assignment) => {
                      const member = members.find((item) => item.id === assignment.memberId)
                      return member ? ROLE_LABELS[member.role] : ""
                    },
                    cell: (assignment) => {
                      const member = members.find((item) => item.id === assignment.memberId)
                      return member ? ROLE_LABELS[member.role] : ""
                    },
                  },
                  {
                    header: "Actions",
                    width: "w-40",
                    align: "center",
                    cell: (assignment) => {
                      const member = members.find((item) => item.id === assignment.memberId)
                      const vessel = vessels.find((item) => item.id === assignment.vesselId)
                      const user = member ? memberName(member) : "this user"
                      const vesselName = vessel?.name ?? "this vessel"
                      return (
                        <DataTableActions
                          fit
                          actions={[
                            {
                              label: "Remove",
                              variant: "destructive",
                              onClick: () =>
                                setPending({
                                  title: "Remove assignment",
                                  description: `Remove ${user} from ${vesselName}?`,
                                  confirmLabel: "Remove",
                                  run: () =>
                                    setActionError(
                                      onRemoveAssignment(assignment.memberId, assignment.vesselId),
                                    ),
                                }),
                            },
                          ]}
                        />
                      )
                    },
                  },
                ]}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" form="vessel-form">
              {editingId ? "Save vessel" : "Add vessel"}
            </Button>
          </DialogFooter>
          {editingId ? confirmDialog() : null}
        </DialogContent>
      </Dialog>
      {editingId ? null : confirmDialog()}
    </section>
  )
}

"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { DataTable, DataTableActions } from "@/components/admin/DataTable"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { assignmentFormSchema, type AssignmentFormValues } from "@/lib/admin/schema"
import {
  memberName,
  ROLE_LABELS,
  type Assignment,
  type Member,
  type Vessel,
} from "@/lib/session/types"

const emptyAssignmentForm: AssignmentFormValues = { memberId: "", vesselId: "" }

export function AssignmentsSection({
  members,
  vessels,
  assignments,
  onAdd,
  onRemove,
}: {
  members: Member[]
  vessels: Vessel[]
  assignments: Assignment[]
  onAdd: (input: { memberId: string; vesselId: string }) => Promise<string | null>
  onRemove: (memberId: string, vesselId: string) => Promise<string | null>
}) {
  const [open, setOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, setPending] = useState<{
    title: string
    description: string
    confirmLabel: string
    run: () => void
  } | null>(null)
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const visibleAssignments = normalizedQuery
    ? assignments.filter((assignment) => {
        const member = members.find((item) => item.id === assignment.memberId)
        if (!member) {
          return false
        }
        return (
          member.firstName.toLowerCase().includes(normalizedQuery) ||
          member.lastName.toLowerCase().includes(normalizedQuery)
        )
      })
    : assignments
  const assignableMembers = members.filter(
    (member) => member.active && member.role !== "admin",
  )
  const memberItems = Object.fromEntries(
    assignableMembers.map((member) => [member.id, memberName(member)]),
  )
  const vesselItems = Object.fromEntries(vessels.map((vessel) => [vessel.id, vessel.name]))
  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: emptyAssignmentForm,
  })

  function closeModal() {
    setOpen(false)
    reset(emptyAssignmentForm)
  }

  function openAdd() {
    reset(emptyAssignmentForm)
    setOpen(true)
  }

  async function onValid(values: AssignmentFormValues) {
    const message = await onAdd(values)
    if (message) {
      setError("root", { message })
      return
    }
    closeModal()
  }

  return (
    <section className="min-w-0 max-w-full rounded-xl border bg-card max-md:overflow-x-auto">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b px-4 py-3 md:flex md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Crew assignments</h2>
          <p className="text-sm text-muted-foreground">
            {assignments.length}{" "}
            {assignments.length === 1 ? "assignment" : "assignments"}
          </p>
        </div>
        <Button type="button" className="md:order-last" onClick={openAdd}>
          Add assignment
        </Button>
        <div className="col-span-2 md:col-auto">
          <Label htmlFor="assignment-search" className="sr-only">
            Search
          </Label>
          <Input
            id="assignment-search"
            value={query}
            placeholder="Search first or last name"
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
        minWidth="min-w-[48rem]"
        empty={normalizedQuery ? "No matching assignments." : "No assignments yet."}
        rows={visibleAssignments}
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
            width: "w-36",
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
            header: "Vessel",
            width: "w-48",
            value: (assignment) =>
              vessels.find((vessel) => vessel.id === assignment.vesselId)?.name ?? "",
            cell: (assignment) =>
              vessels.find((vessel) => vessel.id === assignment.vesselId)?.name,
          },
          {
            header: "Actions",
            width: "w-40",
            align: "center",
            cell: (assignment) => (
              <DataTableActions
                actions={[
                  {
                    label: "Remove",
                    variant: "destructive",
                    onClick: () => {
                      const member = members.find((item) => item.id === assignment.memberId)
                      const vessel = vessels.find((item) => item.id === assignment.vesselId)
                      const user = member ? memberName(member) : "this user"
                      const vesselName = vessel?.name ?? "this vessel"
                      setPending({
                        title: "Remove assignment",
                        description: `Remove ${user} from ${vesselName}?`,
                        confirmLabel: "Remove",
                        run: () => {
                          void onRemove(assignment.memberId, assignment.vesselId).then(setActionError)
                        },
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add assignment</DialogTitle>
            <DialogDescription>
              Choose an active captain or crew member and a vessel.
            </DialogDescription>
          </DialogHeader>
          <form
            id="assignment-form"
            onSubmit={handleSubmit(onValid, () => clearErrors("root"))}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="assignment-user">User</Label>
              <Controller
                name="memberId"
                control={control}
                render={({ field }) => (
                  <Select
                    items={memberItems}
                    value={field.value ? field.value : null}
                    onValueChange={(value) => {
                      if (value !== null) {
                        field.onChange(value)
                      }
                    }}
                  >
                    <SelectTrigger id="assignment-user" className="w-full">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {memberName(member)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.memberId ? (
                <p className="text-sm text-destructive">{errors.memberId.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="assignment-vessel">Vessel</Label>
              <Controller
                name="vesselId"
                control={control}
                render={({ field }) => (
                  <Select
                    items={vesselItems}
                    value={field.value ? field.value : null}
                    onValueChange={(value) => {
                      if (value !== null) {
                        field.onChange(value)
                      }
                    }}
                  >
                    <SelectTrigger id="assignment-vessel" className="w-full">
                      <SelectValue placeholder="Select a vessel" />
                    </SelectTrigger>
                    <SelectContent>
                      {vessels.map((vessel) => (
                        <SelectItem key={vessel.id} value={vessel.id}>
                          {vessel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.vesselId ? (
                <p className="text-sm text-destructive">{errors.vesselId.message}</p>
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
              <Button type="submit">Add assignment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
    </section>
  )
}

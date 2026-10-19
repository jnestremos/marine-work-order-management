"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { DataTable, DataTableActions, type DataTableAction } from "@/components/admin/DataTable"
import { EmptyRole } from "@/components/views/EmptyRole"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  formatRecordDate,
  seaServiceFormSchema,
  type SeaServiceFormValues,
} from "@/lib/records/schema"
import { useSessionStore } from "@/lib/session/store"
import {
  memberName,
  ROLE_LABELS,
  ROLES,
  SEA_SERVICE_STATUS_LABELS,
  type SeaService,
  type SeaServiceStatus,
  type Vessel,
} from "@/lib/session/types"

const emptyVoyage: SeaServiceFormValues = {
  vesselId: "",
  role: "" as SeaServiceFormValues["role"],
  signOnDate: "",
  signOnPort: "",
  signOffDate: "",
  signOffPort: "",
}

const roleItems = Object.fromEntries(ROLES.map((role) => [role, ROLE_LABELS[role]]))

function vesselName(vessels: Vessel[], vesselId: string) {
  return vessels.find((vessel) => vessel.id === vesselId)?.name ?? ""
}

export function SeaServiceSection({
  scope,
  memberId: fixedMemberId,
  embedded = false,
}: {
  scope: "member" | "directory"
  memberId?: string
  embedded?: boolean
}) {
  const directory = useSessionStore((state) => state.directory)
  const setDirectory = useSessionStore((state) => state.setDirectory)
  const sessionMemberId = useSessionStore((state) => state.memberId)
  const member = directory.members.find((item) => item.id === sessionMemberId) ?? null
  const showUser = scope === "directory" && !fixedMemberId
  const people = directory.members.filter((item) => item.role !== "admin")
  const memberItems = Object.fromEntries(people.map((item) => [item.id, memberName(item)]))
  const vesselItems = Object.fromEntries(directory.vessels.map((vessel) => [vessel.id, vessel.name]))
  const records = directory.seaServices
    .filter((record) => {
      if (fixedMemberId) {
        return record.memberId === fixedMemberId
      }
      return scope === "directory" || record.memberId === member?.id
    })
    .sort((left, right) => right.signOnDate.localeCompare(left.signOnDate))
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SeaService | null>(null)
  const [ownerId, setOwnerId] = useState("")
  const [ownerError, setOwnerError] = useState("")
  const [pending, setPending] = useState<{
    title: string
    description: string
    confirmLabel: string
    run: () => void
  } | null>(null)
  const form = useForm<SeaServiceFormValues>({
    resolver: zodResolver(seaServiceFormSchema),
    defaultValues: emptyVoyage,
  })
  const normalizedQuery = query.trim().toLowerCase()
  const visible = normalizedQuery
    ? records.filter((record) => {
        const owner = directory.members.find((item) => item.id === record.memberId)
        const name = vesselName(directory.vessels, record.vesselId).toLowerCase()
        return (
          name.includes(normalizedQuery) ||
          ROLE_LABELS[record.role].toLowerCase().includes(normalizedQuery) ||
          record.signOnPort.toLowerCase().includes(normalizedQuery) ||
          record.signOffPort.toLowerCase().includes(normalizedQuery) ||
          SEA_SERVICE_STATUS_LABELS[record.status].toLowerCase().includes(normalizedQuery) ||
          (owner ? memberName(owner).toLowerCase().includes(normalizedQuery) : false)
        )
      })
    : records

  function close() {
    setOpen(false)
    setEditing(null)
    setOwnerId("")
    setOwnerError("")
    form.reset(emptyVoyage)
    form.clearErrors()
  }

  function openAdd() {
    const fixedMember = fixedMemberId
      ? directory.members.find((item) => item.id === fixedMemberId)
      : null
    setEditing(null)
    setOwnerId(fixedMemberId ?? "")
    setOwnerError("")
    form.reset({
      ...emptyVoyage,
      role:
        fixedMember && fixedMember.role !== "admin"
          ? fixedMember.role
          : scope === "member" && member && member.role !== "admin"
            ? member.role
            : emptyVoyage.role,
    })
    form.clearErrors()
    setOpen(true)
  }

  function openEdit(record: SeaService) {
    setEditing(record)
    setOwnerId(record.memberId)
    setOwnerError("")
    form.reset({
      vesselId: record.vesselId,
      role: record.role,
      signOnDate: record.signOnDate,
      signOnPort: record.signOnPort,
      signOffDate: record.signOffDate,
      signOffPort: record.signOffPort,
    })
    form.clearErrors()
    setOpen(true)
  }

  function save(values: SeaServiceFormValues) {
    const nextOwnerId = fixedMemberId ?? (scope === "directory" ? ownerId : member?.id)
    const owner = directory.members.find((item) => item.id === nextOwnerId)
    if (!owner || owner.role === "admin") {
      setOwnerError("Choose a captain or crew member")
      return
    }
    if (!directory.vessels.some((vessel) => vessel.id === values.vesselId)) {
      form.setError("root", { message: "Vessel is required" })
      return
    }
    if (editing) {
      setDirectory({
        ...directory,
        seaServices: directory.seaServices.map((record) =>
          record.id === editing.id
            ? {
                ...record,
                ...values,
                memberId: owner.id,
                status: scope === "directory" ? record.status : "pending",
              }
            : record,
        ),
      })
    } else {
      setDirectory({
        ...directory,
        seaServices: [
          ...directory.seaServices,
          {
            id: crypto.randomUUID(),
            memberId: owner.id,
            ...values,
            status: scope === "directory" ? "accepted" : "pending",
          },
        ],
      })
    }
    close()
  }

  function setStatus(record: SeaService, status: SeaServiceStatus) {
    setDirectory({
      ...directory,
      seaServices: directory.seaServices.map((item) =>
        item.id === record.id ? { ...item, status } : item,
      ),
    })
  }

  function remove(record: SeaService) {
    setDirectory({
      ...directory,
      seaServices: directory.seaServices.filter((item) => item.id !== record.id),
    })
  }

  if (!embedded && scope === "member" && !member) {
    return <EmptyRole />
  }

  const voyageCount = `${records.length} ${records.length === 1 ? "voyage" : "voyages"}`

  return (
    <section
      className={
        embedded
          ? "flex min-w-0 flex-col gap-2"
          : "min-w-0 max-w-full rounded-xl border bg-card max-md:overflow-x-auto"
      }
    >
      {embedded ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium">Sea service history</h3>
            <p className="text-sm text-muted-foreground">
              {`${voyageCount}. Accept or reject this person's voyages here.`}
            </p>
          </div>
          <Button type="button" onClick={openAdd}>
            Add voyage
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b px-4 py-3 md:flex md:items-center md:justify-between">
          <div>
            <h1 className="text-base font-semibold">Sea service history</h1>
            <p className="text-sm text-muted-foreground">
              {`${voyageCount}${
                scope === "member"
                  ? ". New voyages stay pending until an admin accepts or rejects them."
                  : ""
              }`}
            </p>
          </div>
          <Button type="button" className="md:order-last" onClick={openAdd}>
            Add voyage
          </Button>
          <div className="col-span-2 md:col-auto">
            <Label htmlFor="sea-service-search" className="sr-only">
              Search
            </Label>
            <Input
              id="sea-service-search"
              value={query}
              placeholder={showUser ? "Search name, vessel, or port" : "Search vessel, role, or port"}
              className="w-full md:w-64"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      )}
      <DataTable
        minWidth={showUser ? "min-w-[72rem]" : "min-w-[60rem]"}
        containerClassName={
          embedded ? "h-48 min-w-0 max-w-full overflow-auto rounded-lg border" : undefined
        }
        empty={normalizedQuery ? "No matching voyages." : "No sea service history yet."}
        rows={visible}
        getRowKey={(record) => record.id}
        columns={[
          ...(showUser
            ? [
                {
                  header: "User",
                  cellClassName: "font-medium",
                  value: (record: SeaService) => {
                    const owner = directory.members.find((item) => item.id === record.memberId)
                    return owner ? memberName(owner) : ""
                  },
                  cell: (record: SeaService) => {
                    const owner = directory.members.find((item) => item.id === record.memberId)
                    return owner ? memberName(owner) : ""
                  },
                },
              ]
            : []),
          {
            header: "Vessel",
            cellClassName: showUser ? undefined : "font-medium",
            value: (record) => vesselName(directory.vessels, record.vesselId),
            cell: (record) => vesselName(directory.vessels, record.vesselId),
          },
          {
            header: "Role",
            width: "w-32",
            value: (record) => ROLE_LABELS[record.role],
            cell: (record) => ROLE_LABELS[record.role],
          },
          {
            header: "Sign on",
            width: "w-36",
            value: (record) => record.signOnDate,
            cell: (record) => formatRecordDate(record.signOnDate),
          },
          {
            header: "Sign-on port",
            value: (record) => record.signOnPort,
            cell: (record) => record.signOnPort,
          },
          {
            header: "Sign off",
            width: "w-36",
            value: (record) => record.signOffDate,
            cell: (record) => formatRecordDate(record.signOffDate),
          },
          {
            header: "Sign-off port",
            value: (record) => record.signOffPort,
            cell: (record) => record.signOffPort,
          },
          {
            header: "Status",
            width: "w-32",
            value: (record) => SEA_SERVICE_STATUS_LABELS[record.status],
            cell: (record) => (
              <Badge variant={record.status}>{SEA_SERVICE_STATUS_LABELS[record.status]}</Badge>
            ),
          },
          {
            header: "Actions",
            width: "w-64",
            align: "center",
            cell: (record) => {
              const name = vesselName(directory.vessels, record.vesselId) || "this vessel"
              const removeAction: DataTableAction = {
                label: "Remove",
                variant: "destructive",
                onClick: () =>
                  setPending({
                    title: "Remove sea service",
                    description: `Remove the ${ROLE_LABELS[record.role]} voyage on ${name}?`,
                    confirmLabel: "Remove",
                    run: () => remove(record),
                  }),
              }
              const actions: DataTableAction[] =
                scope === "directory" && record.status === "pending"
                  ? [
                      {
                        label: "Accept",
                        variant: "success",
                        onClick: () => setStatus(record, "accepted"),
                      },
                      {
                        label: "Reject",
                        variant: "destructive",
                        onClick: () => setStatus(record, "rejected"),
                      },
                    ]
                  : [{ label: "Edit", onClick: () => openEdit(record) }, removeAction]
              return <DataTableActions actions={actions} />
            },
          },
        ]}
      />
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            close()
            return
          }
          setOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit sea service" : "Add sea service"}</DialogTitle>
            <DialogDescription>
              {scope === "member"
                ? "Saving a voyage marks it pending until an admin accepts or rejects it."
                : editing
                  ? "Update the voyage. Its review status stays as it is."
                  : "A voyage you add is accepted."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="sea-service-form"
            onSubmit={(event) => {
              event.stopPropagation()
              void form.handleSubmit(save, () => form.clearErrors("root"))(event)
            }}
            className="flex flex-col gap-3"
          >
            {showUser ? (
              <div className="flex flex-col gap-1">
                <Label htmlFor="sea-service-user">User</Label>
                <Select
                  items={memberItems}
                  value={ownerId ? ownerId : null}
                  onValueChange={(value) => {
                    if (!value) {
                      return
                    }
                    setOwnerId(value)
                    setOwnerError("")
                    const owner = people.find((item) => item.id === value)
                    if (owner && !form.getValues("role")) {
                      form.setValue("role", owner.role)
                    }
                  }}
                >
                  <SelectTrigger id="sea-service-user" className="w-full">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {memberName(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ownerError ? <p className="text-sm text-destructive">{ownerError}</p> : null}
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <Label htmlFor="sea-service-vessel">Vessel</Label>
              <Controller
                name="vesselId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    items={vesselItems}
                    value={field.value ? field.value : null}
                    onValueChange={(value) => {
                      if (value) {
                        field.onChange(value)
                      }
                    }}
                  >
                    <SelectTrigger id="sea-service-vessel" className="w-full">
                      <SelectValue placeholder="Select a vessel" />
                    </SelectTrigger>
                    <SelectContent>
                      {directory.vessels.map((vessel) => (
                        <SelectItem key={vessel.id} value={vessel.id}>
                          {vessel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.vesselId ? (
                <p className="text-sm text-destructive">{form.formState.errors.vesselId.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="sea-service-role">Role</Label>
              <Controller
                name="role"
                control={form.control}
                render={({ field }) => (
                  <Select
                    items={roleItems}
                    value={field.value ? field.value : null}
                    onValueChange={(value) => {
                      if (value === "admin" || value === "captain" || value === "crew") {
                        field.onChange(value)
                      }
                    }}
                  >
                    <SelectTrigger
                      id="sea-service-role"
                      className="w-full"
                      aria-invalid={form.formState.errors.role !== undefined}
                    >
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.role ? (
                <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="sea-service-on-date">Sign on</Label>
                <Input
                  id="sea-service-on-date"
                  type="date"
                  aria-invalid={form.formState.errors.signOnDate !== undefined}
                  {...form.register("signOnDate")}
                />
                {form.formState.errors.signOnDate ? (
                  <p className="text-sm text-destructive">{form.formState.errors.signOnDate.message}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="sea-service-on-port">Sign-on port</Label>
                <Input
                  id="sea-service-on-port"
                  aria-invalid={form.formState.errors.signOnPort !== undefined}
                  {...form.register("signOnPort")}
                />
                {form.formState.errors.signOnPort ? (
                  <p className="text-sm text-destructive">{form.formState.errors.signOnPort.message}</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="sea-service-off-date">Sign off</Label>
                <Input
                  id="sea-service-off-date"
                  type="date"
                  aria-invalid={form.formState.errors.signOffDate !== undefined}
                  {...form.register("signOffDate")}
                />
                {form.formState.errors.signOffDate ? (
                  <p className="text-sm text-destructive">{form.formState.errors.signOffDate.message}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="sea-service-off-port">Sign-off port</Label>
                <Input
                  id="sea-service-off-port"
                  aria-invalid={form.formState.errors.signOffPort !== undefined}
                  {...form.register("signOffPort")}
                />
                {form.formState.errors.signOffPort ? (
                  <p className="text-sm text-destructive">{form.formState.errors.signOffPort.message}</p>
                ) : null}
              </div>
            </div>
            {form.formState.errors.root?.message ? (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save voyage" : "Add voyage"}</Button>
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

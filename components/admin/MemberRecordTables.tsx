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
import {
  formatRecordDate,
  seaServiceFormSchema,
  serviceRecordFormSchema,
  type SeaServiceFormValues,
  type ServiceRecordFormValues,
} from "@/lib/records/schema"
import {
  ROLE_LABELS,
  ROLES,
  type Role,
  type SeaService,
  type ServiceRecord,
  type Vessel,
} from "@/lib/session/types"

const emptyServiceRecord: ServiceRecordFormValues = {
  vesselId: "",
  role: "" as ServiceRecordFormValues["role"],
  startDate: "",
  endDate: "",
}

const emptySeaService: SeaServiceFormValues = {
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

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="text-sm text-destructive">{message}</p>
}

function RoleSelect({
  id,
  value,
  invalid,
  onChange,
}: {
  id: string
  value: string
  invalid: boolean
  onChange: (value: Role) => void
}) {
  return (
    <Select
      items={roleItems}
      value={value ? value : null}
      onValueChange={(next) => {
        if (next === "admin" || next === "captain" || next === "crew") {
          onChange(next)
        }
      }}
    >
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
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
  )
}

function VesselSelect({
  id,
  vessels,
  items,
  value,
  onChange,
}: {
  id: string
  vessels: Vessel[]
  items: Record<string, string>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Select
      items={items}
      value={value ? value : null}
      onValueChange={(next) => {
        if (next !== null) {
          onChange(next)
        }
      }}
    >
      <SelectTrigger id={id} className="w-full">
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
  )
}

export function MemberRecordTables({
  vessels,
  serviceRecords,
  seaServices,
  onServiceRecordsChange,
  onSeaServicesChange,
}: {
  vessels: Vessel[]
  serviceRecords: ServiceRecord[]
  seaServices: SeaService[]
  onServiceRecordsChange: (records: ServiceRecord[]) => void
  onSeaServicesChange: (records: SeaService[]) => void
}) {
  const vesselItems = Object.fromEntries(vessels.map((vessel) => [vessel.id, vessel.name]))
  const serviceRows = [...serviceRecords].sort((left, right) =>
    right.startDate.localeCompare(left.startDate),
  )
  const seaRows = [...seaServices].sort((left, right) =>
    right.signOnDate.localeCompare(left.signOnDate),
  )
  const [serviceOpen, setServiceOpen] = useState(false)
  const [serviceEditingId, setServiceEditingId] = useState<string | null>(null)
  const [seaOpen, setSeaOpen] = useState(false)
  const [seaEditingId, setSeaEditingId] = useState<string | null>(null)
  const [pending, setPending] = useState<{
    title: string
    description: string
    confirmLabel: string
    run: () => void
  } | null>(null)
  const serviceForm = useForm<ServiceRecordFormValues>({
    resolver: zodResolver(serviceRecordFormSchema),
    defaultValues: emptyServiceRecord,
  })
  const seaForm = useForm<SeaServiceFormValues>({
    resolver: zodResolver(seaServiceFormSchema),
    defaultValues: emptySeaService,
  })

  function closeService() {
    setServiceOpen(false)
    setServiceEditingId(null)
    serviceForm.reset(emptyServiceRecord)
    serviceForm.clearErrors()
  }

  function openAddService() {
    setServiceEditingId(null)
    serviceForm.reset(emptyServiceRecord)
    serviceForm.clearErrors()
    setServiceOpen(true)
  }

  function openEditService(record: ServiceRecord) {
    setServiceEditingId(record.id)
    serviceForm.reset({
      vesselId: record.vesselId,
      role: record.role,
      startDate: record.startDate,
      endDate: record.endDate,
    })
    serviceForm.clearErrors()
    setServiceOpen(true)
  }

  function saveService(values: ServiceRecordFormValues) {
    if (!vessels.some((vessel) => vessel.id === values.vesselId)) {
      serviceForm.setError("root", { message: "Vessel is required" })
      return
    }
    if (serviceEditingId) {
      onServiceRecordsChange(
        serviceRecords.map((record) =>
          record.id === serviceEditingId ? { ...record, ...values } : record,
        ),
      )
    } else {
      onServiceRecordsChange([
        ...serviceRecords,
        { id: crypto.randomUUID(), memberId: "", ...values },
      ])
    }
    closeService()
  }

  function closeSea() {
    setSeaOpen(false)
    setSeaEditingId(null)
    seaForm.reset(emptySeaService)
    seaForm.clearErrors()
  }

  function openAddSea() {
    setSeaEditingId(null)
    seaForm.reset(emptySeaService)
    seaForm.clearErrors()
    setSeaOpen(true)
  }

  function openEditSea(record: SeaService) {
    setSeaEditingId(record.id)
    seaForm.reset({
      vesselId: record.vesselId,
      role: record.role,
      signOnDate: record.signOnDate,
      signOnPort: record.signOnPort,
      signOffDate: record.signOffDate,
      signOffPort: record.signOffPort,
    })
    seaForm.clearErrors()
    setSeaOpen(true)
  }

  function saveSea(values: SeaServiceFormValues) {
    if (!vessels.some((vessel) => vessel.id === values.vesselId)) {
      seaForm.setError("root", { message: "Vessel is required" })
      return
    }
    if (seaEditingId) {
      onSeaServicesChange(
        seaServices.map((record) =>
          record.id === seaEditingId ? { ...record, ...values } : record,
        ),
      )
    } else {
      onSeaServicesChange([
        ...seaServices,
        { id: crypto.randomUUID(), memberId: "", ...values },
      ])
    }
    closeSea()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Service record</h3>
          <Button type="button" size="sm" onClick={openAddService}>
            Add record
          </Button>
        </div>
        <DataTable
          minWidth="min-w-[48rem]"
          containerClassName="h-48 overflow-auto rounded-lg border"
          stickyHeader
          empty="No service records yet."
          rows={serviceRows}
          getRowKey={(record) => record.id}
          columns={[
            {
              header: "Vessel",
              cellClassName: "font-medium",
              value: (record) => vesselName(vessels, record.vesselId),
              cell: (record) => vesselName(vessels, record.vesselId),
            },
            {
              header: "Role",
              width: "w-32",
              value: (record) => ROLE_LABELS[record.role],
              cell: (record) => ROLE_LABELS[record.role],
            },
            {
              header: "From",
              width: "w-36",
              value: (record) => record.startDate,
              cell: (record) => formatRecordDate(record.startDate),
            },
            {
              header: "To",
              width: "w-36",
              value: (record) => record.endDate || "Present",
              cell: (record) => formatRecordDate(record.endDate),
            },
            {
              header: "Actions",
              width: "w-64",
              align: "center",
              cell: (record) => (
                <DataTableActions
                  actions={[
                    { label: "Edit", onClick: () => openEditService(record) },
                    {
                      label: "Remove",
                      variant: "destructive",
                      onClick: () => {
                        const name = vesselName(vessels, record.vesselId) || "this vessel"
                        setPending({
                          title: "Remove service record",
                          description: `Remove the ${ROLE_LABELS[record.role]} record on ${name}?`,
                          confirmLabel: "Remove",
                          run: () =>
                            onServiceRecordsChange(
                              serviceRecords.filter((item) => item.id !== record.id),
                            ),
                        })
                      },
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Sea service history</h3>
          <Button type="button" size="sm" onClick={openAddSea}>
            Add voyage
          </Button>
        </div>
        <DataTable
          minWidth="min-w-[64rem]"
          containerClassName="h-48 overflow-auto rounded-lg border"
          stickyHeader
          empty="No sea service history yet."
          rows={seaRows}
          getRowKey={(record) => record.id}
          columns={[
            {
              header: "Vessel",
              cellClassName: "font-medium",
              value: (record) => vesselName(vessels, record.vesselId),
              cell: (record) => vesselName(vessels, record.vesselId),
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
              header: "Actions",
              width: "w-64",
              align: "center",
              cell: (record) => (
                <DataTableActions
                  actions={[
                    { label: "Edit", onClick: () => openEditSea(record) },
                    {
                      label: "Remove",
                      variant: "destructive",
                      onClick: () => {
                        const name = vesselName(vessels, record.vesselId) || "this vessel"
                        setPending({
                          title: "Remove sea service",
                          description: `Remove the ${ROLE_LABELS[record.role]} voyage on ${name}?`,
                          confirmLabel: "Remove",
                          run: () =>
                            onSeaServicesChange(
                              seaServices.filter((item) => item.id !== record.id),
                            ),
                        })
                      },
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </div>
      <Dialog
        open={serviceOpen}
        onOpenChange={(next) => {
          if (!next) {
            closeService()
            return
          }
          setServiceOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {serviceEditingId ? "Edit service record" : "Add service record"}
            </DialogTitle>
            <DialogDescription>
              Enter the vessel, role, and the dates of this appointment.
            </DialogDescription>
          </DialogHeader>
          <form
            id="member-service-record-form"
            onSubmit={(event) => {
              event.stopPropagation()
              void serviceForm.handleSubmit(saveService, () => serviceForm.clearErrors("root"))(event)
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="member-service-vessel">Vessel</Label>
              <Controller
                name="vesselId"
                control={serviceForm.control}
                render={({ field }) => (
                  <VesselSelect
                    id="member-service-vessel"
                    vessels={vessels}
                    items={vesselItems}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <FieldError message={serviceForm.formState.errors.vesselId?.message} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="member-service-role">Role</Label>
              <Controller
                name="role"
                control={serviceForm.control}
                render={({ field }) => (
                  <RoleSelect
                    id="member-service-role"
                    value={field.value}
                    invalid={serviceForm.formState.errors.role !== undefined}
                    onChange={field.onChange}
                  />
                )}
              />
              <FieldError message={serviceForm.formState.errors.role?.message} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="member-service-start">From</Label>
                <Input
                  id="member-service-start"
                  type="date"
                  aria-invalid={serviceForm.formState.errors.startDate !== undefined}
                  {...serviceForm.register("startDate")}
                />
                <FieldError message={serviceForm.formState.errors.startDate?.message} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="member-service-end">To</Label>
                <Input
                  id="member-service-end"
                  type="date"
                  aria-invalid={serviceForm.formState.errors.endDate !== undefined}
                  {...serviceForm.register("endDate")}
                />
                <FieldError message={serviceForm.formState.errors.endDate?.message} />
              </div>
            </div>
            {serviceForm.formState.errors.root?.message ? (
              <p role="alert" className="text-sm text-destructive">
                {serviceForm.formState.errors.root.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeService}>
                Cancel
              </Button>
              <Button type="submit">{serviceEditingId ? "Save record" : "Add record"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={seaOpen}
        onOpenChange={(next) => {
          if (!next) {
            closeSea()
            return
          }
          setSeaOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{seaEditingId ? "Edit sea service" : "Add sea service"}</DialogTitle>
            <DialogDescription>
              Enter the vessel, role, and the sign-on and sign-off for this voyage.
            </DialogDescription>
          </DialogHeader>
          <form
            id="member-sea-service-form"
            onSubmit={(event) => {
              event.stopPropagation()
              void seaForm.handleSubmit(saveSea, () => seaForm.clearErrors("root"))(event)
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="member-sea-vessel">Vessel</Label>
              <Controller
                name="vesselId"
                control={seaForm.control}
                render={({ field }) => (
                  <VesselSelect
                    id="member-sea-vessel"
                    vessels={vessels}
                    items={vesselItems}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <FieldError message={seaForm.formState.errors.vesselId?.message} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="member-sea-role">Role</Label>
              <Controller
                name="role"
                control={seaForm.control}
                render={({ field }) => (
                  <RoleSelect
                    id="member-sea-role"
                    value={field.value}
                    invalid={seaForm.formState.errors.role !== undefined}
                    onChange={field.onChange}
                  />
                )}
              />
              <FieldError message={seaForm.formState.errors.role?.message} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="member-sea-on-date">Sign on</Label>
                <Input
                  id="member-sea-on-date"
                  type="date"
                  aria-invalid={seaForm.formState.errors.signOnDate !== undefined}
                  {...seaForm.register("signOnDate")}
                />
                <FieldError message={seaForm.formState.errors.signOnDate?.message} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="member-sea-on-port">Sign-on port</Label>
                <Input
                  id="member-sea-on-port"
                  aria-invalid={seaForm.formState.errors.signOnPort !== undefined}
                  {...seaForm.register("signOnPort")}
                />
                <FieldError message={seaForm.formState.errors.signOnPort?.message} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="member-sea-off-date">Sign off</Label>
                <Input
                  id="member-sea-off-date"
                  type="date"
                  aria-invalid={seaForm.formState.errors.signOffDate !== undefined}
                  {...seaForm.register("signOffDate")}
                />
                <FieldError message={seaForm.formState.errors.signOffDate?.message} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="member-sea-off-port">Sign-off port</Label>
                <Input
                  id="member-sea-off-port"
                  aria-invalid={seaForm.formState.errors.signOffPort !== undefined}
                  {...seaForm.register("signOffPort")}
                />
                <FieldError message={seaForm.formState.errors.signOffPort?.message} />
              </div>
            </div>
            {seaForm.formState.errors.root?.message ? (
              <p role="alert" className="text-sm text-destructive">
                {seaForm.formState.errors.root.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeSea}>
                Cancel
              </Button>
              <Button type="submit">{seaEditingId ? "Save voyage" : "Add voyage"}</Button>
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
    </div>
  )
}

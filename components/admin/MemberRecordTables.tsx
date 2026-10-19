"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
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
  serviceRecordFormSchema,
  type ServiceRecordFormValues,
} from "@/lib/records/schema"
import {
  ROLE_LABELS,
  ROLES,
  type Role,
  type ServiceRecord,
  type Vessel,
} from "@/lib/session/types"

const emptyServiceRecord: ServiceRecordFormValues = {
  vesselId: "",
  role: "" as ServiceRecordFormValues["role"],
  startDate: "",
  endDate: "",
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
  onServiceRecordsChange,
}: {
  vessels: Vessel[]
  serviceRecords: ServiceRecord[]
  onServiceRecordsChange: (records: ServiceRecord[]) => void
}) {
  const vesselItems = Object.fromEntries(vessels.map((vessel) => [vessel.id, vessel.name]))
  const serviceRows = [...serviceRecords].sort((left, right) =>
    right.startDate.localeCompare(left.startDate),
  )
  const [serviceOpen, setServiceOpen] = useState(false)
  const [serviceEditingId, setServiceEditingId] = useState<string | null>(null)
  const [pendingSave, setPendingSave] = useState(false)
  const serviceForm = useForm<ServiceRecordFormValues>({
    resolver: zodResolver(serviceRecordFormSchema),
    defaultValues: emptyServiceRecord,
  })
  const serviceStartDate = useWatch({ control: serviceForm.control, name: "startDate" })
  const serviceEndDate = useWatch({ control: serviceForm.control, name: "endDate" })

  function closeService() {
    setServiceOpen(false)
    setServiceEditingId(null)
    setPendingSave(false)
    serviceForm.reset(emptyServiceRecord)
    serviceForm.clearErrors()
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

  function persistService(values: ServiceRecordFormValues) {
    if (!vessels.some((vessel) => vessel.id === values.vesselId)) {
      serviceForm.setError("root", { message: "Vessel is required" })
      return
    }
    if (!serviceEditingId) {
      return
    }
    onServiceRecordsChange(
      serviceRecords.map((record) =>
        record.id === serviceEditingId ? { ...record, ...values } : record,
      ),
    )
    closeService()
  }

  function requestSaveService() {
    serviceForm.clearErrors("root")
    void serviceForm.handleSubmit((values) => {
      setPendingSave(true)
    }, () => serviceForm.clearErrors("root"))()
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <div>
          <h3 className="font-medium">Service record</h3>
          <p className="text-sm text-muted-foreground">
            An appointment opens when this user is assigned. Setting an end date (or removing the
            assignment) signs them off that vessel.
          </p>
        </div>
        <DataTable
          minWidth="min-w-[48rem]"
          containerClassName="h-48 min-w-0 max-w-full overflow-auto rounded-lg border"
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
              width: "min-w-32",
              value: (record) => ROLE_LABELS[record.role],
              cell: (record) => ROLE_LABELS[record.role],
            },
            {
              header: "From",
              width: "min-w-36",
              value: (record) => record.startDate,
              cell: (record) => formatRecordDate(record.startDate),
            },
            {
              header: "To",
              width: "min-w-36",
              value: (record) => record.endDate || "Present",
              cell: (record) => formatRecordDate(record.endDate),
            },
            {
              header: "Actions",
              width: "min-w-40",
              align: "center",
              cell: (record) => (
                <DataTableActions
                  actions={[{ label: "Edit", onClick: () => openEditService(record) }]}
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
            <DialogTitle>Edit service record</DialogTitle>
            <DialogDescription>
              Update the vessel, role, and dates. An end date removes this user from the vessel.
            </DialogDescription>
          </DialogHeader>
          <form
            id="member-service-record-form"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              requestSaveService()
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
                  max={serviceEndDate || undefined}
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
                  min={serviceStartDate || undefined}
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
              <Button type="button" variant="success" onClick={requestSaveService}>
                Save record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={pendingSave}
        title="Save record?"
        description="Save these service record changes? An end date removes this user from the vessel when you save the user."
        confirmLabel="Save record"
        confirmVariant="success"
        onOpenChange={(next) => {
          if (!next) {
            setPendingSave(false)
          }
        }}
        onConfirm={() => {
          setPendingSave(false)
          void serviceForm.handleSubmit(persistService, () => serviceForm.clearErrors("root"))()
        }}
      />
    </div>
  )
}

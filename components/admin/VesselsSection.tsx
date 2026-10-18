"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
import { vesselFormSchema, type VesselFormValues } from "@/lib/admin/schema"
import type { Vessel } from "@/lib/session/types"

const emptyVesselForm: VesselFormValues = { name: "" }

export function VesselsSection({
  vessels,
  onSave,
  onSetActive,
}: {
  vessels: Vessel[]
  onSave: (input: { id?: string; name: string }) => string | null
  onSetActive: (vesselId: string, active: boolean) => string | null
}) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const visibleVessels = normalizedQuery
    ? vessels.filter((vessel) => vessel.name.toLowerCase().includes(normalizedQuery))
    : vessels
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

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">Vessels</h2>
          <p className="text-sm text-muted-foreground">
            {vessels.length} {vessels.length === 1 ? "vessel" : "vessels"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="vessel-search" className="sr-only">
            Search
          </Label>
          <Input
            id="vessel-search"
            value={query}
            placeholder="Search name"
            className="w-56"
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="button" onClick={openAdd}>
            Add vessel
          </Button>
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
            cell: (vessel) => vessel.name,
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
                    onClick: () => setActionError(onSetActive(vessel.id, !vessel.active)),
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? "Save vessel" : "Add vessel"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

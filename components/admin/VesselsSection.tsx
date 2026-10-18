"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fieldError, vesselFormSchema } from "@/lib/admin/schema"
import type { Vessel } from "@/lib/session/types"

export function VesselsSection({
  vessels,
  onSave,
  onSetActive,
}: {
  vessels: Vessel[]
  onSave: (input: { id?: string; name: string }) => string | null
  onSetActive: (vesselId: string, active: boolean) => string | null
}) {
  const [name, setName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  function resetForm() {
    setName("")
    setEditingId(null)
    setNameError(null)
    setFormError(null)
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = vesselFormSchema.safeParse({ name })
    if (!parsed.success) {
      setNameError(fieldError(parsed.error, "name"))
      setFormError(null)
      return
    }
    setNameError(null)
    const message = onSave({ id: editingId ?? undefined, name: parsed.data.name })
    if (message) {
      setFormError(message)
      return
    }
    resetForm()
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Vessels</h2>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <div className="flex w-full flex-col gap-1 sm:max-w-sm">
          <Label htmlFor="vessel-name">Name</Label>
          <Input
            id="vessel-name"
            value={name}
            aria-invalid={nameError !== null}
            onChange={(event) => setName(event.target.value)}
          />
          {nameError ? <p className="text-sm text-destructive">{nameError}</p> : null}
        </div>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit">{editingId ? "Save vessel" : "Add vessel"}</Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
      <ul className="mt-4 divide-y">
        {vessels.map((vessel) => (
          <li key={vessel.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
            <span className="font-medium">{vessel.name}</span>
            <span className="text-muted-foreground">
              {vessel.active ? "Active" : "Inactive"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingId(vessel.id)
                setName(vessel.name)
                setNameError(null)
                setFormError(null)
              }}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormError(onSetActive(vessel.id, !vessel.active))}
            >
              {vessel.active ? "Deactivate" : "Activate"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

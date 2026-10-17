"use client"

import { useState } from "react"
import { useCatalog } from "@/components/admin/catalog-context"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function VesselRow({
  vesselId,
  name,
  active,
}: {
  vesselId: string
  name: string
  active: boolean
}) {
  const { updateVessel } = useCatalog()
  const [draft, setDraft] = useState(name)

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <Input
        aria-label={`Name for ${name}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const trimmed = draft.trim()
          if (trimmed.length === 0 || trimmed === name) {
            setDraft(name)
            return
          }
          updateVessel(vesselId, { name: trimmed })
        }}
        className="sm:max-w-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={active}
          onCheckedChange={(checked) => {
            updateVessel(vesselId, { active: checked === true })
          }}
        />
        Active
      </label>
    </li>
  )
}

export function VesselPanel() {
  const { vessels, createVessel } = useCatalog()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Vessels</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add and edit vessels in memory. Changes reset on refresh.
        </p>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          const id = createVessel(name)
          if (!id) {
            setError("Enter a vessel name.")
            return
          }
          setName("")
          setError(null)
        }}
      >
        <div className="flex w-full flex-col gap-1 sm:max-w-sm">
          <Label htmlFor="new-vessel-name">New vessel</Label>
          <Input
            id="new-vessel-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="MV Tide"
            aria-invalid={error ? true : undefined}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <Button type="submit">Add vessel</Button>
      </form>

      <ul className="divide-y border-y">
        {vessels.map((vessel) => (
          <VesselRow
            key={vessel.id}
            vesselId={vessel.id}
            name={vessel.name}
            active={vessel.active}
          />
        ))}
      </ul>
    </section>
  )
}

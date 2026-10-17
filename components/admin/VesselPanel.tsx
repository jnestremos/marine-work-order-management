"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Vessel } from "@/lib/session/types"

function VesselRow({
  vessel,
  onUpdate,
}: {
  vessel: Vessel
  onUpdate: (patch: { name?: string; active?: boolean }) => void
}) {
  const [draft, setDraft] = useState(vessel.name)

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <Input
        aria-label={`Name for ${vessel.name}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const trimmed = draft.trim()
          if (trimmed.length === 0 || trimmed === vessel.name) {
            setDraft(vessel.name)
            return
          }
          onUpdate({ name: trimmed })
        }}
        className="sm:max-w-sm"
      />
      <div className="flex items-center gap-2 text-sm">
        <Checkbox
          id={`vessel-active-${vessel.id}`}
          checked={vessel.active}
          onCheckedChange={(checked) => {
            onUpdate({ active: checked === true })
          }}
        />
        <label htmlFor={`vessel-active-${vessel.id}`}>Active</label>
      </div>
    </li>
  )
}

export function VesselPanel({
  vessels,
  onCreate,
  onUpdate,
}: {
  vessels: Vessel[]
  onCreate: (name: string) => string | null
  onUpdate: (
    vesselId: string,
    patch: { name?: string; active?: boolean },
  ) => void
}) {
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
          const id = onCreate(name)
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
            vessel={vessel}
            onUpdate={(patch) => onUpdate(vessel.id, patch)}
          />
        ))}
      </ul>
    </section>
  )
}

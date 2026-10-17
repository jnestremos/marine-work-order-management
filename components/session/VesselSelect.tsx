"use client"

import { useShallow } from "zustand/react/shallow"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSessionStore } from "@/lib/session/store"

export function VesselSelect() {
  const vesselId = useSessionStore((state) => state.vesselId)
  const setVesselId = useSessionStore((state) => state.setVesselId)
  const vessels = useSessionStore(useShallow((state) => state.vesselOptions()))
  const vesselItems = Object.fromEntries(
    vessels.map((vessel) => [vessel.id, vessel.name]),
  )

  return (
    <div className="flex w-full flex-col gap-1 sm:w-auto">
      <label htmlFor="vessel-select" className="text-sm font-medium">
        Vessel
      </label>
      <Select
        items={vesselItems}
        value={vesselId}
        onValueChange={(value) => {
          if (value !== null) {
            setVesselId(value)
          }
        }}
      >
        <SelectTrigger id="vessel-select" className="w-full sm:w-40 sm:min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {vessels.map((vessel) => (
            <SelectItem key={vessel.id} value={vessel.id}>
              {vessel.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

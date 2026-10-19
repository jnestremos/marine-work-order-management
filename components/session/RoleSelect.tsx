"use client"

import { useShallow } from "zustand/react/shallow"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ROLE_LABELS } from "@/lib/session/types"
import { useSessionStore } from "@/lib/session/store"

export function RoleSelect() {
  const role = useSessionStore((state) => state.role)
  const setRole = useSessionStore((state) => state.setRole)
  const roles = useSessionStore(useShallow((state) => state.roleOptions()))
  const roleItems = Object.fromEntries(roles.map((item) => [item, ROLE_LABELS[item]]))

  if (roles.length === 0) {
    return (
      <div className="flex w-full flex-col gap-1 sm:w-auto">
        <label htmlFor="role-empty" className="text-sm font-medium">
          Role
        </label>
        <button
          id="role-empty"
          type="button"
          disabled
          className="flex h-8 w-full items-center rounded-lg border border-input bg-muted px-2.5 text-left text-sm whitespace-nowrap text-muted-foreground sm:w-auto sm:min-w-40"
        >
          No roles for this vessel.
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-1 sm:w-auto">
      <label htmlFor="role-select" className="text-sm font-medium">
        Role
      </label>
      <Select
        items={roleItems}
        value={role}
        onValueChange={(value) => {
          if (value !== null) {
            setRole(value)
          }
        }}
      >
        <SelectTrigger id="role-select" className="w-full sm:w-40 sm:min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((item) => (
            <SelectItem key={item} value={item}>
              {ROLE_LABELS[item]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

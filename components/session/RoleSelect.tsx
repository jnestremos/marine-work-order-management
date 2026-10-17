"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ROLE_LABELS, ROLES } from "@/lib/session/types"
import { useSessionStore } from "@/lib/session/store"

export function RoleSelect() {
  const role = useSessionStore((state) => state.role)
  const setRole = useSessionStore((state) => state.setRole)

  return (
    <div className="flex w-full flex-col gap-1 sm:w-auto">
      <label htmlFor="role-select" className="text-sm font-medium">
        Role
      </label>
      <Select
        items={ROLE_LABELS}
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
          {ROLES.map((item) => (
            <SelectItem key={item} value={item}>
              {ROLE_LABELS[item]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

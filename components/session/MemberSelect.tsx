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

export function MemberSelect() {
  const memberId = useSessionStore((state) => state.memberId)
  const setMemberId = useSessionStore((state) => state.setMemberId)
  const members = useSessionStore(useShallow((state) => state.memberOptions()))
  const memberItems = Object.fromEntries(
    members.map((member) => [member.id, member.name]),
  )

  if (members.length === 0 || memberId === null) {
    return (
      <div className="flex w-full flex-col gap-1 sm:w-auto">
        <label htmlFor="member-empty" className="text-sm font-medium">
          Member
        </label>
        <button
          id="member-empty"
          type="button"
          disabled
          className="flex h-8 w-full items-center rounded-lg border border-input bg-muted px-2.5 text-left text-sm whitespace-nowrap text-muted-foreground sm:w-auto sm:min-w-40"
        >
          No active members for this role.
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-1 sm:w-auto">
      <label htmlFor="member-select" className="text-sm font-medium">
        Member
      </label>
      <Select
        items={memberItems}
        value={memberId}
        onValueChange={(value) => {
          if (value !== null) {
            setMemberId(value)
          }
        }}
      >
        <SelectTrigger id="member-select" className="w-full sm:w-40 sm:min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

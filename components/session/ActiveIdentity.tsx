"use client"

import { memberName, ROLE_LABELS } from "@/lib/session/types"
import { useSessionStore } from "@/lib/session/store"

export function ActiveIdentity() {
  const role = useSessionStore((state) => state.role)
  const memberId = useSessionStore((state) => state.memberId)
  const members = useSessionStore((state) => state.directory.members)
  const member = members.find((item) => item.id === memberId)
  const roleLabel = ROLE_LABELS[role]
  const text = member
    ? `${memberName(member)} · ${roleLabel}`
    : `${roleLabel} · No member selected`

  return <p className="text-sm text-muted-foreground">{text}</p>
}

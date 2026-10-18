"use client"

import { marineFixture } from "@/lib/fixtures/marine"
import { memberName, ROLE_LABELS } from "@/lib/session/types"
import { useSessionStore } from "@/lib/session/store"

export function ActiveIdentity() {
  const role = useSessionStore((state) => state.role)
  const memberId = useSessionStore((state) => state.memberId)
  const member = marineFixture.members.find((item) => item.id === memberId)
  const roleLabel = ROLE_LABELS[role]
  const text = member
    ? `${memberName(member)} · ${roleLabel}`
    : `${roleLabel} · No member selected`

  return <p className="text-sm text-muted-foreground">{text}</p>
}

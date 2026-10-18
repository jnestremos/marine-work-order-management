"use client"

import { marineFixture } from "@/lib/fixtures/marine"
import { memberName, ROLE_LABELS } from "@/lib/session/types"
import { useSessionStore } from "@/lib/session/store"

export function ActiveIdentity() {
  const vesselId = useSessionStore((state) => state.vesselId)
  const role = useSessionStore((state) => state.role)
  const memberId = useSessionStore((state) => state.memberId)
  const vessel = marineFixture.vessels.find((item) => item.id === vesselId)
  const member = marineFixture.members.find((item) => item.id === memberId)
  const roleLabel = ROLE_LABELS[role]
  const text = member
    ? `${memberName(member)} · ${roleLabel} · ${vessel?.name}`
    : `${roleLabel} · ${vessel?.name} · No member selected`

  return <p className="text-sm text-muted-foreground">{text}</p>
}

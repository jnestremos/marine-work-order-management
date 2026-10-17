"use client"

import { useCatalogStore } from "@/lib/catalog/store"
import { ROLE_LABELS } from "@/lib/session/types"
import { useSessionStore } from "@/lib/session/store"

export function ActiveIdentity() {
  const vesselId = useSessionStore((state) => state.vesselId)
  const role = useSessionStore((state) => state.role)
  const memberId = useSessionStore((state) => state.memberId)
  const vessels = useCatalogStore((state) => state.vessels)
  const members = useCatalogStore((state) => state.members)
  const vessel = vessels.find((item) => item.id === vesselId)
  const member = members.find((item) => item.id === memberId)
  const roleLabel = ROLE_LABELS[role]
  const vesselName = vessel?.name ?? "No vessel"
  const text = member
    ? `${member.name} · ${roleLabel} · ${vesselName}`
    : `${roleLabel} · ${vesselName} · No member selected`

  return <p className="text-sm text-muted-foreground">{text}</p>
}

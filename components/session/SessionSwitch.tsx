"use client"

import type { ReactNode } from "react"
import { useCatalogStore } from "@/lib/catalog/store"
import { useSessionStore } from "@/lib/session/store"

export function SessionSwitch({
  admin,
  captain,
  crew,
  empty,
}: {
  admin: ReactNode
  captain: ReactNode
  crew: ReactNode
  empty: ReactNode
}) {
  const memberId = useSessionStore((state) => state.memberId)
  const members = useCatalogStore((state) => state.members)
  const member = members.find((item) => item.id === memberId)
  if (!member) {
    return empty
  }
  if (member.role === "admin") {
    return admin
  }
  if (member.role === "captain") {
    return captain
  }
  return crew
}

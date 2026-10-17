"use client"

import type { ReactNode } from "react"
import { marineFixture } from "@/lib/fixtures/marine"
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
  const member = marineFixture.members.find((item) => item.id === memberId)
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

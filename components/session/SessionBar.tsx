"use client"

import { ActiveIdentity } from "@/components/session/ActiveIdentity"
import { MemberSelect } from "@/components/session/MemberSelect"
import { RoleSelect } from "@/components/session/RoleSelect"
import { VesselSelect } from "@/components/session/VesselSelect"

export function SessionBar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <VesselSelect />
        <RoleSelect />
        <MemberSelect />
        <div className="sm:ml-auto sm:pb-2">
          <ActiveIdentity />
        </div>
      </div>
    </header>
  )
}

"use client"

import { useState } from "react"
import { AssignmentPanel } from "@/components/admin/AssignmentPanel"
import { MemberPanel } from "@/components/admin/MemberPanel"
import { VesselPanel } from "@/components/admin/VesselPanel"
import {
  addMember,
  addVessel,
  cloneMarineFixture,
  patchAssignment,
  patchMember,
  patchVessel,
} from "@/lib/fixtures/catalog"
import type { Role } from "@/lib/session/types"

export function AdminWorkspace() {
  const [catalog, setCatalog] = useState(cloneMarineFixture)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 text-muted-foreground">
          Manage vessels, members, roles, and assignments against the marine
          mock data. Edits stay in memory until refresh.
        </p>
      </header>
      <VesselPanel
        vessels={catalog.vessels}
        onCreate={(name) => {
          const next = addVessel(catalog, name)
          if (!next) {
            return null
          }
          setCatalog(next.catalog)
          return next.id
        }}
        onUpdate={(vesselId, patch) => {
          setCatalog((current) => patchVessel(current, vesselId, patch))
        }}
      />
      <MemberPanel
        members={catalog.members}
        onCreate={(name, role: Role) => {
          const next = addMember(catalog, name, role)
          if (!next) {
            return null
          }
          setCatalog(next.catalog)
          return next.id
        }}
        onUpdate={(memberId, patch) => {
          setCatalog((current) => patchMember(current, memberId, patch))
        }}
      />
      <AssignmentPanel
        members={catalog.members}
        vessels={catalog.vessels}
        assignments={catalog.assignments}
        onToggle={(memberId, vesselId, assigned) => {
          setCatalog((current) =>
            patchAssignment(current, memberId, vesselId, assigned),
          )
        }}
      />
    </div>
  )
}

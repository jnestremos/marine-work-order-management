"use client"

import { AssignmentPanel } from "@/components/admin/AssignmentPanel"
import { MemberPanel } from "@/components/admin/MemberPanel"
import { VesselPanel } from "@/components/admin/VesselPanel"

export function AdminWorkspace() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 text-muted-foreground">
          Manage vessels, members, roles, and assignments for the reviewer
          shell.
        </p>
      </header>
      <VesselPanel />
      <MemberPanel />
      <AssignmentPanel />
    </div>
  )
}

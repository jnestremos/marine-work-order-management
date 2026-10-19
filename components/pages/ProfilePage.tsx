"use client"

import { Badge } from "@/components/ui/badge"
import { useMarine } from "@/components/data/MarineProvider"
import { EmptyRole } from "@/components/views/EmptyRole"
import { useSessionStore } from "@/lib/session/store"
import { memberName, ROLE_LABELS } from "@/lib/session/types"

export function ProfilePage() {
  const memberId = useSessionStore((state) => state.memberId)
  const marine = useMarine()
  const member = marine.members.find((item) => item.id === memberId)

  if (!member) {
    return <EmptyRole />
  }

  const vessels = marine.assignments.flatMap((assignment) => {
    if (assignment.memberId !== member.id) {
      return []
    }
    const vessel = marine.vessels.find((item) => item.id === assignment.vesselId)
    return vessel ? [vessel.name] : []
  })

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h1 className="text-base font-semibold">Profile settings</h1>
      </div>
      <dl className="grid gap-4 px-4 py-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">Name</dt>
          <dd className="mt-1 font-medium">{memberName(member)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Role</dt>
          <dd className="mt-1 font-medium">{ROLE_LABELS[member.role]}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Status</dt>
          <dd className="mt-1">
            <Badge variant={member.active ? "active" : "inactive"}>
              {member.active ? "Active" : "Inactive"}
            </Badge>
          </dd>
        </div>
        {member.role === "admin" ? null : (
          <div>
            <dt className="text-sm text-muted-foreground">Vessel</dt>
            <dd className="mt-1 font-medium">
              {vessels.length > 0 ? vessels.join(", ") : "No vessel assigned"}
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}

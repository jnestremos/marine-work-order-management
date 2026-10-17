"use client"

import { withSessionSync } from "@/components/admin/syncCatalog"
import { Checkbox } from "@/components/ui/checkbox"
import { useCatalogStore } from "@/lib/catalog/store"

export function AssignmentPanel() {
  const members = useCatalogStore((state) => state.members).filter(
    (member) => member.active,
  )
  const vessels = useCatalogStore((state) => state.vessels).filter(
    (vessel) => vessel.active,
  )
  const assignments = useCatalogStore((state) => state.assignments)
  const setAssignment = useCatalogStore((state) => state.setAssignment)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Assignments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which active vessels each active member can work on.
        </p>
      </div>

      {members.length === 0 || vessels.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add at least one active member and one active vessel to manage
          assignments.
        </p>
      ) : (
        <ul className="divide-y border-y">
          {members.map((member) => (
            <li key={member.id} className="space-y-3 py-3">
              <p className="text-sm font-medium">{member.name}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {vessels.map((vessel) => {
                  const assigned = assignments.some(
                    (assignment) =>
                      assignment.memberId === member.id &&
                      assignment.vesselId === vessel.id,
                  )
                  return (
                    <label
                      key={vessel.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={assigned}
                        onCheckedChange={(checked) => {
                          withSessionSync(() => {
                            setAssignment(
                              member.id,
                              vessel.id,
                              checked === true,
                            )
                          })
                        }}
                      />
                      {vessel.name}
                    </label>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

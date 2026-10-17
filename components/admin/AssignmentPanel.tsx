"use client"

import { useCatalog } from "@/components/admin/catalog-context"
import { Checkbox } from "@/components/ui/checkbox"

export function AssignmentPanel() {
  const { members, vessels, assignments, setAssignment } = useCatalog()
  const activeMembers = members.filter((member) => member.active)
  const activeVessels = vessels.filter((vessel) => vessel.active)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Assignments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which active vessels each active member can work on. Changes
          reset on refresh.
        </p>
      </div>

      {activeMembers.length === 0 || activeVessels.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add at least one active member and one active vessel to manage
          assignments.
        </p>
      ) : (
        <ul className="divide-y border-y">
          {activeMembers.map((member) => (
            <li key={member.id} className="space-y-3 py-3">
              <p className="text-sm font-medium">{member.name}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {activeVessels.map((vessel) => {
                  const assigned = assignments.some(
                    (assignment) =>
                      assignment.memberId === member.id &&
                      assignment.vesselId === vessel.id,
                  )
                  const inputId = `assignment-${member.id}-${vessel.id}`
                  return (
                    <div
                      key={vessel.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        id={inputId}
                        checked={assigned}
                        onCheckedChange={(checked) => {
                          setAssignment(
                            member.id,
                            vessel.id,
                            checked === true,
                          )
                        }}
                      />
                      <label htmlFor={inputId}>{vessel.name}</label>
                    </div>
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

"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { assignmentFormSchema, fieldError } from "@/lib/admin/schema"
import type { Assignment, Member, Vessel } from "@/lib/session/types"

export function AssignmentsSection({
  members,
  vessels,
  assignments,
  onAdd,
  onRemove,
}: {
  members: Member[]
  vessels: Vessel[]
  assignments: Assignment[]
  onAdd: (input: { memberId: string; vesselId: string }) => string | null
  onRemove: (memberId: string, vesselId: string) => string | null
}) {
  const [memberId, setMemberId] = useState("")
  const [vesselId, setVesselId] = useState("")
  const [personError, setPersonError] = useState<string | null>(null)
  const [vesselError, setVesselError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const memberItems = Object.fromEntries(members.map((member) => [member.id, member.name]))
  const vesselItems = Object.fromEntries(vessels.map((vessel) => [vessel.id, vessel.name]))

  function resetForm() {
    setMemberId("")
    setVesselId("")
    setPersonError(null)
    setVesselError(null)
    setFormError(null)
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = assignmentFormSchema.safeParse({ memberId, vesselId })
    if (!parsed.success) {
      setPersonError(fieldError(parsed.error, "memberId"))
      setVesselError(fieldError(parsed.error, "vesselId"))
      setFormError(null)
      return
    }
    setPersonError(null)
    setVesselError(null)
    const message = onAdd(parsed.data)
    if (message) {
      setFormError(message)
      return
    }
    resetForm()
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Assignments</h2>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex w-full flex-col gap-1 sm:max-w-sm">
            <Label htmlFor="assignment-person">Person</Label>
            <Select
              items={memberItems}
              value={memberId === "" ? null : memberId}
              onValueChange={(value) => {
                if (value !== null) {
                  setMemberId(value)
                }
              }}
            >
              <SelectTrigger id="assignment-person" className="w-full">
                <SelectValue placeholder="Select a person" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {personError ? (
              <p className="text-sm text-destructive">{personError}</p>
            ) : null}
          </div>
          <div className="flex w-full flex-col gap-1 sm:max-w-sm">
            <Label htmlFor="assignment-vessel">Vessel</Label>
            <Select
              items={vesselItems}
              value={vesselId === "" ? null : vesselId}
              onValueChange={(value) => {
                if (value !== null) {
                  setVesselId(value)
                }
              }}
            >
              <SelectTrigger id="assignment-vessel" className="w-full">
                <SelectValue placeholder="Select a vessel" />
              </SelectTrigger>
              <SelectContent>
                {vessels.map((vessel) => (
                  <SelectItem key={vessel.id} value={vessel.id}>
                    {vessel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vesselError ? (
              <p className="text-sm text-destructive">{vesselError}</p>
            ) : null}
          </div>
        </div>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <div>
          <Button type="submit">Add assignment</Button>
        </div>
      </form>
      <ul className="mt-4 divide-y">
        {assignments.map((assignment) => {
          const member = members.find((item) => item.id === assignment.memberId)
          const vessel = vessels.find((item) => item.id === assignment.vesselId)
          return (
            <li
              key={`${assignment.memberId}:${assignment.vesselId}`}
              className="flex flex-wrap items-center gap-2 py-2 text-sm"
            >
              <span className="font-medium">{member?.name}</span>
              <span>{vessel?.name}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFormError(onRemove(assignment.memberId, assignment.vesselId))
                }
              >
                Remove
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

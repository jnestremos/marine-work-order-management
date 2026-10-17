"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  isRole,
  ROLE_LABELS,
  ROLES,
  type Member,
  type Role,
} from "@/lib/session/types"

function MemberRow({
  member,
  onUpdate,
}: {
  member: Member
  onUpdate: (patch: { name?: string; role?: Role; active?: boolean }) => void
}) {
  const [draft, setDraft] = useState(member.name)

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <Input
        aria-label={`Name for ${member.name}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const trimmed = draft.trim()
          if (trimmed.length === 0 || trimmed === member.name) {
            setDraft(member.name)
            return
          }
          onUpdate({ name: trimmed })
        }}
        className="sm:max-w-xs"
      />
      <div className="flex w-full flex-col gap-1 sm:w-40">
        <Label htmlFor={`member-role-${member.id}`} className="sr-only">
          Role for {member.name}
        </Label>
        <Select
          items={ROLE_LABELS}
          value={member.role}
          onValueChange={(value) => {
            if (value === null || !isRole(value)) {
              return
            }
            onUpdate({ role: value })
          }}
        >
          <SelectTrigger
            id={`member-role-${member.id}`}
            className="w-full sm:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((item) => (
              <SelectItem key={item} value={item}>
                {ROLE_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Checkbox
          id={`member-active-${member.id}`}
          checked={member.active}
          onCheckedChange={(checked) => {
            onUpdate({ active: checked === true })
          }}
        />
        <label htmlFor={`member-active-${member.id}`}>Active</label>
      </div>
    </li>
  )
}

export function MemberPanel({
  members,
  onCreate,
  onUpdate,
}: {
  members: Member[]
  onCreate: (name: string, role: Role) => string | null
  onUpdate: (
    memberId: string,
    patch: { name?: string; role?: Role; active?: boolean },
  ) => void
}) {
  const [name, setName] = useState("")
  const [role, setRole] = useState<Role>("crew")
  const [error, setError] = useState<string | null>(null)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Members</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add people and set roles in memory. Changes reset on refresh.
        </p>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          const id = onCreate(name, role)
          if (!id) {
            setError("Enter a member name.")
            return
          }
          setName("")
          setRole("crew")
          setError(null)
        }}
      >
        <div className="flex w-full flex-col gap-1 sm:max-w-xs">
          <Label htmlFor="new-member-name">New member</Label>
          <Input
            id="new-member-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Lane Quinn"
            aria-invalid={error ? true : undefined}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="flex w-full flex-col gap-1 sm:w-40">
          <Label htmlFor="new-member-role">Role</Label>
          <Select
            items={ROLE_LABELS}
            value={role}
            onValueChange={(value) => {
              if (value !== null && isRole(value)) {
                setRole(value)
              }
            }}
          >
            <SelectTrigger id="new-member-role" className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((item) => (
                <SelectItem key={item} value={item}>
                  {ROLE_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">Add member</Button>
      </form>

      <ul className="divide-y border-y">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            onUpdate={(patch) => onUpdate(member.id, patch)}
          />
        ))}
      </ul>
    </section>
  )
}

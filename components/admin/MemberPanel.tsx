"use client"

import { useState } from "react"
import { useCatalog } from "@/components/admin/catalog-context"
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
  type Role,
} from "@/lib/session/types"

function MemberRow({
  memberId,
  name,
  role,
  active,
}: {
  memberId: string
  name: string
  role: Role
  active: boolean
}) {
  const { updateMember } = useCatalog()
  const [draft, setDraft] = useState(name)

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <Input
        aria-label={`Name for ${name}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const trimmed = draft.trim()
          if (trimmed.length === 0 || trimmed === name) {
            setDraft(name)
            return
          }
          updateMember(memberId, { name: trimmed })
        }}
        className="sm:max-w-xs"
      />
      <div className="flex w-full flex-col gap-1 sm:w-40">
        <Label htmlFor={`member-role-${memberId}`} className="sr-only">
          Role for {name}
        </Label>
        <Select
          items={ROLE_LABELS}
          value={role}
          onValueChange={(value) => {
            if (value === null || !isRole(value)) {
              return
            }
            updateMember(memberId, { role: value })
          }}
        >
          <SelectTrigger
            id={`member-role-${memberId}`}
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
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={active}
          onCheckedChange={(checked) => {
            updateMember(memberId, { active: checked === true })
          }}
        />
        Active
      </label>
    </li>
  )
}

export function MemberPanel() {
  const { members, createMember } = useCatalog()
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
          const id = createMember(name, role)
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
            memberId={member.id}
            name={member.name}
            role={member.role}
            active={member.active}
          />
        ))}
      </ul>
    </section>
  )
}

"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fieldError, personFormSchema } from "@/lib/admin/schema"
import { ROLE_LABELS, ROLES, type Member, type Role } from "@/lib/session/types"

const roleItems = Object.fromEntries(ROLES.map((role) => [role, ROLE_LABELS[role]]))

export function PeopleSection({
  members,
  onSave,
  onSetActive,
}: {
  members: Member[]
  onSave: (input: { id?: string; name: string; role: Role }) => string | null
  onSetActive: (memberId: string, active: boolean) => string | null
}) {
  const [name, setName] = useState("")
  const [role, setRole] = useState<Role | "">("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  function resetForm() {
    setName("")
    setRole("")
    setEditingId(null)
    setNameError(null)
    setRoleError(null)
    setFormError(null)
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = personFormSchema.safeParse({ name, role })
    if (!parsed.success) {
      setNameError(fieldError(parsed.error, "name"))
      setRoleError(fieldError(parsed.error, "role"))
      setFormError(null)
      return
    }
    setNameError(null)
    setRoleError(null)
    const message = onSave({
      id: editingId ?? undefined,
      name: parsed.data.name,
      role: parsed.data.role,
    })
    if (message) {
      setFormError(message)
      return
    }
    resetForm()
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">People</h2>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex w-full flex-col gap-1 sm:max-w-sm">
            <Label htmlFor="person-name">Name</Label>
            <Input
              id="person-name"
              value={name}
              aria-invalid={nameError !== null}
              onChange={(event) => setName(event.target.value)}
            />
            {nameError ? <p className="text-sm text-destructive">{nameError}</p> : null}
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-40">
            <Label htmlFor="person-role">Role</Label>
            <Select
              items={roleItems}
              value={role === "" ? null : role}
              onValueChange={(value) => {
                if (value === "admin" || value === "captain" || value === "crew") {
                  setRole(value)
                }
              }}
            >
              <SelectTrigger id="person-role" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {ROLE_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleError ? <p className="text-sm text-destructive">{roleError}</p> : null}
          </div>
        </div>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit">{editingId ? "Save person" : "Add person"}</Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
      <ul className="mt-4 divide-y">
        {members.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
            <span className="font-medium">{member.name}</span>
            <span>{ROLE_LABELS[member.role]}</span>
            <span className="text-muted-foreground">
              {member.active ? "Active" : "Inactive"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingId(member.id)
                setName(member.name)
                setRole(member.role)
                setNameError(null)
                setRoleError(null)
                setFormError(null)
              }}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormError(onSetActive(member.id, !member.active))}
            >
              {member.active ? "Deactivate" : "Activate"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

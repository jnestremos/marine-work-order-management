"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { marineFixture } from "@/lib/fixtures/marine"
import { isRole, type MarineFixture, type Role } from "@/lib/session/types"

type CatalogActions = {
  createVessel: (name: string) => string | null
  updateVessel: (
    vesselId: string,
    patch: { name?: string; active?: boolean },
  ) => void
  createMember: (name: string, role: Role) => string | null
  updateMember: (
    memberId: string,
    patch: { name?: string; role?: Role; active?: boolean },
  ) => void
  setAssignment: (
    memberId: string,
    vesselId: string,
    assigned: boolean,
  ) => void
}

type CatalogContextValue = MarineFixture & CatalogActions

const CatalogContext = createContext<CatalogContextValue | null>(null)

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return slug.length > 0 ? slug : "item"
}

function uniqueId(
  prefix: "vessel" | "member",
  name: string,
  existing: Iterable<string>,
): string {
  const ids = new Set(existing)
  const base = `${prefix}_${slugify(name)}`
  if (!ids.has(base)) {
    return base
  }
  let suffix = 2
  while (ids.has(`${base}_${suffix}`)) {
    suffix += 1
  }
  return `${base}_${suffix}`
}

function cloneFixture(): MarineFixture {
  return structuredClone(marineFixture)
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<MarineFixture>(cloneFixture)

  const value = useMemo<CatalogContextValue>(() => {
    return {
      ...catalog,
      createVessel: (name) => {
        const trimmed = name.trim()
        if (trimmed.length === 0) {
          return null
        }
        const id = uniqueId(
          "vessel",
          trimmed,
          catalog.vessels.map((vessel) => vessel.id),
        )
        setCatalog((current) => ({
          ...current,
          vessels: [...current.vessels, { id, name: trimmed, active: true }],
        }))
        return id
      },
      updateVessel: (vesselId, patch) => {
        setCatalog((current) => {
          const index = current.vessels.findIndex(
            (vessel) => vessel.id === vesselId,
          )
          if (index < 0) {
            return current
          }
          const vessel = current.vessels[index]
          const name =
            patch.name !== undefined ? patch.name.trim() : vessel.name
          if (name.length === 0) {
            return current
          }
          const vessels = [...current.vessels]
          vessels[index] = {
            ...vessel,
            name,
            active: patch.active ?? vessel.active,
          }
          return { ...current, vessels }
        })
      },
      createMember: (name, role) => {
        const trimmed = name.trim()
        if (trimmed.length === 0 || !isRole(role)) {
          return null
        }
        const id = uniqueId(
          "member",
          trimmed,
          catalog.members.map((member) => member.id),
        )
        setCatalog((current) => ({
          ...current,
          members: [
            ...current.members,
            { id, name: trimmed, role, active: true },
          ],
        }))
        return id
      },
      updateMember: (memberId, patch) => {
        setCatalog((current) => {
          const index = current.members.findIndex(
            (member) => member.id === memberId,
          )
          if (index < 0) {
            return current
          }
          const member = current.members[index]
          const name =
            patch.name !== undefined ? patch.name.trim() : member.name
          if (name.length === 0) {
            return current
          }
          if (patch.role !== undefined && !isRole(patch.role)) {
            return current
          }
          const members = [...current.members]
          members[index] = {
            ...member,
            name,
            role: patch.role ?? member.role,
            active: patch.active ?? member.active,
          }
          return { ...current, members }
        })
      },
      setAssignment: (memberId, vesselId, assigned) => {
        setCatalog((current) => {
          const member = current.members.find((item) => item.id === memberId)
          const vessel = current.vessels.find((item) => item.id === vesselId)
          if (!member || !vessel) {
            return current
          }
          const exists = current.assignments.some(
            (assignment) =>
              assignment.memberId === memberId &&
              assignment.vesselId === vesselId,
          )
          if (assigned && !exists) {
            return {
              ...current,
              assignments: [...current.assignments, { memberId, vesselId }],
            }
          }
          if (!assigned && exists) {
            return {
              ...current,
              assignments: current.assignments.filter(
                (assignment) =>
                  !(
                    assignment.memberId === memberId &&
                    assignment.vesselId === vesselId
                  ),
              ),
            }
          }
          return current
        })
      },
    }
  }, [catalog])

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  )
}

export function useCatalog(): CatalogContextValue {
  const value = useContext(CatalogContext)
  if (!value) {
    throw new Error("useCatalog must be used within CatalogProvider")
  }
  return value
}

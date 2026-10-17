import { marineFixture } from "@/lib/fixtures/marine"
import { isRole, type MarineFixture, type Role } from "@/lib/session/types"

export function cloneMarineFixture(): MarineFixture {
  return structuredClone(marineFixture)
}

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

export function addVessel(
  catalog: MarineFixture,
  name: string,
): { catalog: MarineFixture; id: string } | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return null
  }
  const id = uniqueId(
    "vessel",
    trimmed,
    catalog.vessels.map((vessel) => vessel.id),
  )
  return {
    id,
    catalog: {
      ...catalog,
      vessels: [...catalog.vessels, { id, name: trimmed, active: true }],
    },
  }
}

export function patchVessel(
  catalog: MarineFixture,
  vesselId: string,
  patch: { name?: string; active?: boolean },
): MarineFixture {
  const index = catalog.vessels.findIndex((vessel) => vessel.id === vesselId)
  if (index < 0) {
    return catalog
  }
  const vessel = catalog.vessels[index]
  const name = patch.name !== undefined ? patch.name.trim() : vessel.name
  if (name.length === 0) {
    return catalog
  }
  const vessels = [...catalog.vessels]
  vessels[index] = {
    ...vessel,
    name,
    active: patch.active ?? vessel.active,
  }
  return { ...catalog, vessels }
}

export function addMember(
  catalog: MarineFixture,
  name: string,
  role: Role,
): { catalog: MarineFixture; id: string } | null {
  const trimmed = name.trim()
  if (trimmed.length === 0 || !isRole(role)) {
    return null
  }
  const id = uniqueId(
    "member",
    trimmed,
    catalog.members.map((member) => member.id),
  )
  return {
    id,
    catalog: {
      ...catalog,
      members: [
        ...catalog.members,
        { id, name: trimmed, role, active: true },
      ],
    },
  }
}

export function patchMember(
  catalog: MarineFixture,
  memberId: string,
  patch: { name?: string; role?: Role; active?: boolean },
): MarineFixture {
  const index = catalog.members.findIndex((member) => member.id === memberId)
  if (index < 0) {
    return catalog
  }
  const member = catalog.members[index]
  const name = patch.name !== undefined ? patch.name.trim() : member.name
  if (name.length === 0) {
    return catalog
  }
  if (patch.role !== undefined && !isRole(patch.role)) {
    return catalog
  }
  const members = [...catalog.members]
  members[index] = {
    ...member,
    name,
    role: patch.role ?? member.role,
    active: patch.active ?? member.active,
  }
  return { ...catalog, members }
}

export function patchAssignment(
  catalog: MarineFixture,
  memberId: string,
  vesselId: string,
  assigned: boolean,
): MarineFixture {
  const member = catalog.members.find((item) => item.id === memberId)
  const vessel = catalog.vessels.find((item) => item.id === vesselId)
  if (!member || !vessel) {
    return catalog
  }
  const exists = catalog.assignments.some(
    (assignment) =>
      assignment.memberId === memberId && assignment.vesselId === vesselId,
  )
  if (assigned && !exists) {
    return {
      ...catalog,
      assignments: [...catalog.assignments, { memberId, vesselId }],
    }
  }
  if (!assigned && exists) {
    return {
      ...catalog,
      assignments: catalog.assignments.filter(
        (assignment) =>
          !(
            assignment.memberId === memberId &&
            assignment.vesselId === vesselId
          ),
      ),
    }
  }
  return catalog
}

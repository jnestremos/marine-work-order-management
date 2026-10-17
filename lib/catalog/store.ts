import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware"
import { marineFixture } from "@/lib/fixtures/marine"
import { localStorageAdapter } from "@/lib/session/storage"
import {
  CATALOG_STORAGE_KEY,
  isRole,
  type Assignment,
  type MarineFixture,
  type Member,
  type Role,
  type SessionStorage,
  type Vessel,
} from "@/lib/session/types"

export type CatalogState = MarineFixture

export type ResolvedCatalog = {
  catalog: CatalogState
  shouldWrite: boolean
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

function isVessel(value: unknown): value is Vessel {
  if (typeof value !== "object" || value === null) {
    return false
  }
  return (
    "id" in value &&
    "name" in value &&
    "active" in value &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.active === "boolean"
  )
}

function isMember(value: unknown): value is Member {
  if (typeof value !== "object" || value === null) {
    return false
  }
  return (
    "id" in value &&
    "name" in value &&
    "role" in value &&
    "active" in value &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isRole(value.role) &&
    typeof value.active === "boolean"
  )
}

function isAssignment(value: unknown): value is Assignment {
  if (typeof value !== "object" || value === null) {
    return false
  }
  return (
    "memberId" in value &&
    "vesselId" in value &&
    typeof value.memberId === "string" &&
    typeof value.vesselId === "string"
  )
}

function readEnvelope(parsed: unknown): CatalogState | null {
  if (typeof parsed !== "object" || parsed === null || !("state" in parsed)) {
    return null
  }
  const state = parsed.state
  if (typeof state !== "object" || state === null) {
    return null
  }
  if (
    !("vessels" in state) ||
    !("members" in state) ||
    !("assignments" in state)
  ) {
    return null
  }
  if (
    !Array.isArray(state.vessels) ||
    !Array.isArray(state.members) ||
    !Array.isArray(state.assignments)
  ) {
    return null
  }
  if (!state.vessels.every(isVessel)) {
    return null
  }
  if (!state.members.every(isMember)) {
    return null
  }
  if (!state.assignments.every(isAssignment)) {
    return null
  }
  return {
    vessels: state.vessels,
    members: state.members,
    assignments: state.assignments,
  }
}

export function resolveCatalog(
  raw: string | null,
  seed: CatalogState,
): ResolvedCatalog {
  if (raw === null) {
    return { catalog: seed, shouldWrite: true }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { catalog: seed, shouldWrite: true }
  }

  const catalog = readEnvelope(parsed)
  if (!catalog) {
    return { catalog: seed, shouldWrite: true }
  }

  return { catalog, shouldWrite: false }
}

function catalogEnvelope(catalog: CatalogState): string {
  return JSON.stringify({ state: catalog, version: 0 })
}

function persistStorage(
  storage: SessionStorage,
  seed: CatalogState,
): StateStorage {
  return {
    getItem: (name) => {
      let raw: string | null
      try {
        raw = storage.getItem(name)
      } catch {
        raw = null
      }
      const { catalog, shouldWrite } = resolveCatalog(raw, seed)
      const next = catalogEnvelope(catalog)
      if (shouldWrite) {
        try {
          storage.setItem(name, next)
        } catch {
          // Caller still receives the resolved catalog.
        }
      }
      return next
    },
    setItem: (name, value) => {
      try {
        if (storage.getItem(name) === value) {
          return
        }
      } catch {
        // A failed read still attempts the write.
      }
      try {
        storage.setItem(name, value)
      } catch {
        // Memory already holds the next catalog.
      }
    },
    removeItem: (name) => {
      try {
        storage.removeItem(name)
      } catch {
        // Nothing in memory depends on the delete.
      }
    },
  }
}

export type CatalogStore = CatalogState & {
  hasHydrated: boolean
  setHasHydrated: (hasHydrated: boolean) => void
  activeVessels: () => Vessel[]
  activeMembers: () => Member[]
  createVessel: (name: string) => string | null
  updateVessel: (
    vesselId: string,
    patch: Partial<Pick<Vessel, "name" | "active">>,
  ) => void
  createMember: (name: string, role: Role) => string | null
  updateMember: (
    memberId: string,
    patch: Partial<Pick<Member, "name" | "role" | "active">>,
  ) => void
  setAssignment: (
    memberId: string,
    vesselId: string,
    assigned: boolean,
  ) => void
  asFixture: () => MarineFixture
}

export function createCatalogStore(
  deps: CatalogState & { storage: SessionStorage },
) {
  const seed: CatalogState = {
    vessels: deps.vessels,
    members: deps.members,
    assignments: deps.assignments,
  }

  return createStore<CatalogStore>()(
    persist(
      (set, get) => ({
        ...seed,
        hasHydrated: false,
        setHasHydrated: (hasHydrated) => set({ hasHydrated }),
        activeVessels: () => get().vessels.filter((vessel) => vessel.active),
        activeMembers: () => get().members.filter((member) => member.active),
        asFixture: () => ({
          vessels: get().vessels,
          members: get().members,
          assignments: get().assignments,
        }),
        createVessel: (name) => {
          const trimmed = name.trim()
          if (trimmed.length === 0) {
            return null
          }
          const id = uniqueId(
            "vessel",
            trimmed,
            get().vessels.map((vessel) => vessel.id),
          )
          set({
            vessels: [...get().vessels, { id, name: trimmed, active: true }],
          })
          return id
        },
        updateVessel: (vesselId, patch) => {
          const vessels = get().vessels
          const index = vessels.findIndex((vessel) => vessel.id === vesselId)
          if (index < 0) {
            return
          }
          const current = vessels[index]
          const name =
            patch.name !== undefined ? patch.name.trim() : current.name
          if (name.length === 0) {
            return
          }
          const next = [...vessels]
          next[index] = {
            ...current,
            name,
            active: patch.active ?? current.active,
          }
          set({ vessels: next })
        },
        createMember: (name, role) => {
          const trimmed = name.trim()
          if (trimmed.length === 0 || !isRole(role)) {
            return null
          }
          const id = uniqueId(
            "member",
            trimmed,
            get().members.map((member) => member.id),
          )
          set({
            members: [
              ...get().members,
              { id, name: trimmed, role, active: true },
            ],
          })
          return id
        },
        updateMember: (memberId, patch) => {
          const members = get().members
          const index = members.findIndex((member) => member.id === memberId)
          if (index < 0) {
            return
          }
          const current = members[index]
          const name =
            patch.name !== undefined ? patch.name.trim() : current.name
          if (name.length === 0) {
            return
          }
          if (patch.role !== undefined && !isRole(patch.role)) {
            return
          }
          const next = [...members]
          next[index] = {
            ...current,
            name,
            role: patch.role ?? current.role,
            active: patch.active ?? current.active,
          }
          set({ members: next })
        },
        setAssignment: (memberId, vesselId, assigned) => {
          const member = get().members.find((item) => item.id === memberId)
          const vessel = get().vessels.find((item) => item.id === vesselId)
          if (!member || !vessel) {
            return
          }
          const assignments = get().assignments
          const exists = assignments.some(
            (assignment) =>
              assignment.memberId === memberId &&
              assignment.vesselId === vesselId,
          )
          if (assigned && !exists) {
            set({
              assignments: [...assignments, { memberId, vesselId }],
            })
            return
          }
          if (!assigned && exists) {
            set({
              assignments: assignments.filter(
                (assignment) =>
                  !(
                    assignment.memberId === memberId &&
                    assignment.vesselId === vesselId
                  ),
              ),
            })
          }
        },
      }),
      {
        name: CATALOG_STORAGE_KEY,
        skipHydration: true,
        storage: createJSONStorage(() => persistStorage(deps.storage, seed)),
        partialize: (state) => ({
          vessels: state.vessels,
          members: state.members,
          assignments: state.assignments,
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true)
        },
      },
    ),
  )
}

export const catalogStore = createCatalogStore({
  ...marineFixture,
  storage: localStorageAdapter,
})

export function useCatalogStore<T>(selector: (state: CatalogStore) => T): T {
  return useStore(catalogStore, selector)
}

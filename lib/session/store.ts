import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware"
import { marineFixture } from "@/lib/fixtures/marine"
import { localStorageAdapter } from "@/lib/session/storage"
import type {
  MarineFixture,
  Member,
  Role,
  SessionState,
  SessionStorage,
  Vessel,
} from "@/lib/session/types"
import { isRole, ROLES, SESSION_STORAGE_KEY } from "@/lib/session/types"

export type { SessionState } from "@/lib/session/types"

export type ResolvedSession = {
  session: SessionState
  shouldWrite: boolean
}

export function activeVessels(fixture: MarineFixture): Vessel[] {
  return fixture.vessels.filter((vessel) => vessel.active)
}

export function membersFor(
  fixture: MarineFixture,
  vesselId: string,
  role: Role,
): Member[] {
  if (role === "admin") {
    return fixture.members.filter((member) => member.active && member.role === "admin")
  }
  return fixture.members.filter(
    (member) =>
      member.active &&
      member.role === role &&
      fixture.assignments.some(
        (assignment) =>
          assignment.memberId === member.id &&
          assignment.vesselId === vesselId,
      ),
  )
}

export function defaultSession(fixture: MarineFixture): SessionState {
  const vessel = activeVessels(fixture)[0]
  if (!vessel) {
    throw new Error("Fixture has no active vessel")
  }
  const admin = membersFor(fixture, vessel.id, "admin")[0]
  if (!admin) {
    throw new Error("Fixture has no active admin")
  }
  return {
    vesselId: vessel.id,
    role: "admin",
    memberId: admin.id,
  }
}

function readEnvelope(parsed: unknown): SessionState | null {
  if (typeof parsed !== "object" || parsed === null || !("state" in parsed)) {
    return null
  }
  const state = parsed.state
  if (typeof state !== "object" || state === null) {
    return null
  }
  if (
    !("vesselId" in state) ||
    !("role" in state) ||
    !("memberId" in state)
  ) {
    return null
  }
  const vesselId = state.vesselId
  const role = state.role
  const memberId = state.memberId
  if (typeof vesselId !== "string" || !isRole(role)) {
    return null
  }
  if (memberId !== null && typeof memberId !== "string") {
    return null
  }
  return { vesselId, role, memberId }
}

export function resolveSession(
  raw: string | null,
  fixture: MarineFixture,
): ResolvedSession {
  const fallback = defaultSession(fixture)
  if (raw === null) {
    return { session: fallback, shouldWrite: true }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { session: fallback, shouldWrite: true }
  }

  const session = readEnvelope(parsed)
  if (!session) {
    return { session: fallback, shouldWrite: true }
  }

  const vessel = fixture.vessels.find((item) => item.id === session.vesselId)
  if (!vessel || !vessel.active) {
    return { session: fallback, shouldWrite: true }
  }

  const options = membersFor(fixture, session.vesselId, session.role)
  if (session.memberId === null) {
    if (options.length === 0) {
      return { session, shouldWrite: false }
    }
    return { session: fallback, shouldWrite: true }
  }

  const member = options.find((item) => item.id === session.memberId)
  if (!member) {
    return { session: fallback, shouldWrite: true }
  }

  return { session, shouldWrite: false }
}

function sessionEnvelope(session: SessionState): string {
  return JSON.stringify({ state: session, version: 0 })
}

function persistStorage(
  storage: SessionStorage,
  fixture: MarineFixture,
): StateStorage {
  return {
    getItem: (name) => {
      let raw: string | null
      try {
        raw = storage.getItem(name)
      } catch {
        raw = null
      }
      const { session, shouldWrite } = resolveSession(raw, fixture)
      const next = sessionEnvelope(session)
      if (shouldWrite) {
        try {
          storage.setItem(name, next)
        } catch {
          // The caller still receives the resolved session.
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
        // Memory already holds the next session.
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

export function sessionForDirectory(
  directory: MarineFixture,
  session: SessionState,
): SessionState {
  const vessels = activeVessels(directory)
  let vesselId = session.vesselId
  let role = session.role
  let memberId = session.memberId
  if (!vessels.some((vessel) => vessel.id === vesselId)) {
    const nextVessel = vessels[0]
    if (!nextVessel) {
      return { vesselId, role, memberId: null }
    }
    vesselId = nextVessel.id
  }
  if (role === "admin") {
    const admins = membersFor(directory, vesselId, "admin")
    const still = admins.find((member) => member.id === memberId)
    return { vesselId, role, memberId: still?.id ?? admins[0]?.id ?? null }
  }
  const current = membersFor(directory, vesselId, role)
  if (current.length > 0) {
    const still = current.find((member) => member.id === memberId)
    return { vesselId, role, memberId: still?.id ?? current[0].id }
  }
  for (const nextRole of ROLES) {
    if (nextRole === "admin") {
      continue
    }
    const options = membersFor(directory, vesselId, nextRole)
    if (options.length > 0) {
      return { vesselId, role: nextRole, memberId: options[0].id }
    }
  }
  return { vesselId, role, memberId: null }
}

function copyDirectory(fixture: MarineFixture): MarineFixture {
  return {
    vessels: fixture.vessels.map((vessel) => ({ ...vessel })),
    members: fixture.members.map((member) => ({ ...member })),
    assignments: fixture.assignments.map((assignment) => ({ ...assignment })),
    serviceRecords: fixture.serviceRecords.map((record) => ({ ...record })),
    seaServices: fixture.seaServices.map((record) => ({ ...record })),
  }
}

export type SessionStore = SessionState & {
  directory: MarineFixture
  hasHydrated: boolean
  setHasHydrated: (hasHydrated: boolean) => void
  setDirectory: (directory: MarineFixture) => void
  vesselOptions: () => Vessel[]
  memberOptions: () => Member[]
  setVesselId: (vesselId: string) => void
  setRole: (role: Role) => void
  setMemberId: (memberId: string) => void
}

export function createSessionStore(
  deps: MarineFixture & { storage: SessionStorage },
) {
  const fixture: MarineFixture = {
    vessels: deps.vessels,
    members: deps.members,
    assignments: deps.assignments,
    serviceRecords: deps.serviceRecords,
    seaServices: deps.seaServices,
  }

  return createStore<SessionStore>()(
    persist(
      (set, get) => ({
        ...defaultSession(fixture),
        directory: copyDirectory(fixture),
        hasHydrated: false,
        setHasHydrated: (hasHydrated) => set({ hasHydrated }),
        setDirectory: (directory) => {
          set({ directory, ...sessionForDirectory(directory, get()) })
        },
        vesselOptions: () => activeVessels(get().directory),
        memberOptions: () =>
          membersFor(get().directory, get().vesselId, get().role),
        setVesselId: (vesselId) => {
          const directory = get().directory
          const vessel = directory.vessels.find(
            (item) => item.id === vesselId && item.active,
          )
          if (!vessel) {
            return
          }
          if (get().role === "admin") {
            const admin =
              membersFor(directory, vesselId, "admin").find(
                (member) => member.id === get().memberId,
              ) ?? membersFor(directory, vesselId, "admin")[0]
            set({ vesselId, memberId: admin?.id ?? null })
            return
          }
          const current = membersFor(directory, vesselId, get().role)
          if (current.length > 0) {
            set({ vesselId, memberId: current[0].id })
            return
          }
          for (const role of ROLES) {
            if (role === "admin") {
              continue
            }
            const options = membersFor(directory, vesselId, role)
            if (options.length > 0) {
              set({ vesselId, role, memberId: options[0].id })
              return
            }
          }
          set({ vesselId, memberId: null })
        },
        setRole: (role) => {
          if (!isRole(role)) {
            return
          }
          const options = membersFor(get().directory, get().vesselId, role)
          set({ role, memberId: options[0]?.id ?? null })
        },
        setMemberId: (memberId) => {
          const match = membersFor(get().directory, get().vesselId, get().role).find(
            (member) => member.id === memberId,
          )
          if (!match) {
            return
          }
          set({ memberId })
        },
      }),
      {
        name: SESSION_STORAGE_KEY,
        skipHydration: true,
        storage: createJSONStorage(() => persistStorage(deps.storage, fixture)),
        partialize: (state) => ({
          vesselId: state.vesselId,
          role: state.role,
          memberId: state.memberId,
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true)
        },
      },
    ),
  )
}

export const sessionStore = createSessionStore({
  ...marineFixture,
  storage: localStorageAdapter,
})

export function useSessionStore<T>(selector: (state: SessionStore) => T): T {
  return useStore(sessionStore, selector)
}

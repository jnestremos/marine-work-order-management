import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware"
import { catalogStore } from "@/lib/catalog/store"
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
    return {
      vesselId: "",
      role: "admin",
      memberId: null,
    }
  }
  const admin = membersFor(fixture, vessel.id, "admin")[0]
  if (admin) {
    return {
      vesselId: vessel.id,
      role: "admin",
      memberId: admin.id,
    }
  }
  for (const role of ROLES) {
    const member = membersFor(fixture, vessel.id, role)[0]
    if (member) {
      return {
        vesselId: vessel.id,
        role,
        memberId: member.id,
      }
    }
  }
  return {
    vesselId: vessel.id,
    role: "admin",
    memberId: null,
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

  if (session.vesselId === "") {
    if (fallback.vesselId === "") {
      return { session, shouldWrite: false }
    }
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
  getCatalog: () => MarineFixture,
): StateStorage {
  return {
    getItem: (name) => {
      let raw: string | null
      try {
        raw = storage.getItem(name)
      } catch {
        raw = null
      }
      const { session, shouldWrite } = resolveSession(raw, getCatalog())
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

export type SessionStore = SessionState & {
  hasHydrated: boolean
  setHasHydrated: (hasHydrated: boolean) => void
  vesselOptions: () => Vessel[]
  memberOptions: () => Member[]
  setVesselId: (vesselId: string) => void
  setRole: (role: Role) => void
  setMemberId: (memberId: string) => void
  syncFromCatalog: () => void
}

export function createSessionStore(deps: {
  getCatalog: () => MarineFixture
  storage: SessionStorage
}) {
  const getCatalog = deps.getCatalog

  return createStore<SessionStore>()(
    persist(
      (set, get) => ({
        ...defaultSession(getCatalog()),
        hasHydrated: false,
        setHasHydrated: (hasHydrated) => set({ hasHydrated }),
        vesselOptions: () => activeVessels(getCatalog()),
        memberOptions: () =>
          membersFor(getCatalog(), get().vesselId, get().role),
        setVesselId: (vesselId) => {
          const fixture = getCatalog()
          const vessel = fixture.vessels.find(
            (item) => item.id === vesselId && item.active,
          )
          if (!vessel) {
            return
          }
          const current = membersFor(fixture, vesselId, get().role)
          if (current.length > 0) {
            set({ vesselId, memberId: current[0].id })
            return
          }
          for (const role of ROLES) {
            const options = membersFor(fixture, vesselId, role)
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
          const options = membersFor(getCatalog(), get().vesselId, role)
          set({ role, memberId: options[0]?.id ?? null })
        },
        setMemberId: (memberId) => {
          const match = membersFor(
            getCatalog(),
            get().vesselId,
            get().role,
          ).find((member) => member.id === memberId)
          if (!match) {
            return
          }
          set({ memberId })
        },
        syncFromCatalog: () => {
          const fixture = getCatalog()
          const current: SessionState = {
            vesselId: get().vesselId,
            role: get().role,
            memberId: get().memberId,
          }
          const { session } = resolveSession(
            sessionEnvelope(current),
            fixture,
          )
          if (
            session.vesselId !== current.vesselId ||
            session.role !== current.role ||
            session.memberId !== current.memberId
          ) {
            set(session)
          }
        },
      }),
      {
        name: SESSION_STORAGE_KEY,
        skipHydration: true,
        storage: createJSONStorage(() =>
          persistStorage(deps.storage, getCatalog),
        ),
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
  getCatalog: () => catalogStore.getState().asFixture(),
  storage: localStorageAdapter,
})

export function useSessionStore<T>(selector: (state: SessionStore) => T): T {
  return useStore(sessionStore, selector)
}

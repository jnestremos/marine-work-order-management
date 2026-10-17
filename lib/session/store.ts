import { createStore, type StoreApi } from "zustand/vanilla"
import type {
  MarineFixture,
  Member,
  Role,
  SessionState,
  SessionStorage,
  Vessel,
} from "@/lib/session/types"
import { isRole, ROLES } from "@/lib/session/types"

export type { SessionState }

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
    throw new Error("Fixture has no active vessel")
  }
  const admin = membersFor(fixture, vessel.id, "admin")[0]
  if (!admin) {
    throw new Error("Fixture has no active admin on the default vessel")
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

export type SessionStore = SessionState & {
  hasHydrated: boolean
  setHasHydrated: (hasHydrated: boolean) => void
  vesselOptions: () => Vessel[]
  memberOptions: () => Member[]
  setVesselId: (vesselId: string) => void
  setRole: (role: Role) => void
  setMemberId: (memberId: string) => void
}

export function createSessionStore(
  deps: MarineFixture & { storage: SessionStorage },
): StoreApi<SessionStore> {
  const fixture: MarineFixture = {
    vessels: deps.vessels,
    members: deps.members,
    assignments: deps.assignments,
  }

  return createStore<SessionStore>()((set, get) => ({
    ...defaultSession(fixture),
    hasHydrated: false,
    setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    vesselOptions: () => activeVessels(fixture),
    memberOptions: () => membersFor(fixture, get().vesselId, get().role),
    setVesselId: (vesselId) => {
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
      const options = membersFor(fixture, get().vesselId, role)
      set({ role, memberId: options[0]?.id ?? null })
    },
    setMemberId: (memberId) => {
      const match = membersFor(fixture, get().vesselId, get().role).find(
        (member) => member.id === memberId,
      )
      if (!match) {
        return
      }
      set({ memberId })
    },
  }))
}

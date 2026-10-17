import type {
  MarineFixture,
  Member,
  Role,
  SessionState,
  Vessel,
} from "@/lib/session/types"
import { isRole } from "@/lib/session/types"

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

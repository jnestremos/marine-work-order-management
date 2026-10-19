import { describe, expect, it } from "vitest"
import { SESSION_STORAGE_KEY, type MarineFixture, type SessionStorage } from "@/lib/session/types"
import {
  createSessionStore,
  defaultSession,
  resolveSession,
  type SessionState,
} from "@/lib/session/store"

/** Minimal directory for session-store unit tests. Not used at runtime. */
const directory: MarineFixture = {
  vessels: [
    { id: "vessel_horizon", name: "MV Horizon", active: true },
    { id: "vessel_aurora", name: "MV Aurora", active: true },
    { id: "vessel_retired", name: "MV Retired", active: false },
  ],
  members: [
    { id: "member_avery", firstName: "Avery", lastName: "Chen", role: "admin", active: true },
    { id: "member_blake", firstName: "Blake", lastName: "Ortiz", role: "captain", active: true },
    { id: "member_casey", firstName: "Casey", lastName: "Nguyen", role: "crew", active: true },
    { id: "member_drew", firstName: "Drew", lastName: "Patel", role: "captain", active: true },
    { id: "member_eden", firstName: "Eden", lastName: "Brooks", role: "crew", active: false },
    { id: "member_frank", firstName: "Frank", lastName: "Adler", role: "admin", active: true },
    { id: "member_gina", firstName: "Gina", lastName: "Morales", role: "captain", active: true },
    { id: "member_harper", firstName: "Harper", lastName: "Singh", role: "crew", active: true },
    { id: "member_ivan", firstName: "Ivan", lastName: "Brooks", role: "crew", active: true },
    { id: "member_june", firstName: "June", lastName: "Okonkwo", role: "captain", active: true },
    { id: "member_kai", firstName: "Kai", lastName: "Nakamura", role: "crew", active: true },
  ],
  assignments: [
    { memberId: "member_blake", vesselId: "vessel_horizon" },
    { memberId: "member_casey", vesselId: "vessel_horizon" },
    { memberId: "member_drew", vesselId: "vessel_aurora" },
    { memberId: "member_harper", vesselId: "vessel_horizon" },
    { memberId: "member_ivan", vesselId: "vessel_horizon" },
    { memberId: "member_kai", vesselId: "vessel_horizon" },
  ],
  serviceRecords: [],
  seaServices: [],
}

const fallback: SessionState = {
  vesselId: "vessel_horizon",
  role: "admin",
  memberId: "member_avery",
}

function envelope(session: SessionState): string {
  return JSON.stringify({ state: session, version: 0 })
}

describe("resolveSession", () => {
  it("restores the default for a missing payload", () => {
    expect(resolveSession(null, directory)).toEqual({
      session: fallback,
      shouldWrite: true,
    })
  })

  it("restores the default for malformed JSON", () => {
    expect(resolveSession("{not json", directory)).toEqual({
      session: fallback,
      shouldWrite: true,
    })
  })

  it("restores the default for an inactive vessel", () => {
    const raw = envelope({
      vesselId: "vessel_retired",
      role: "admin",
      memberId: "member_avery",
    })
    expect(resolveSession(raw, directory)).toEqual({
      session: fallback,
      shouldWrite: true,
    })
  })

  it("restores the default for an inactive member", () => {
    const raw = envelope({
      vesselId: "vessel_horizon",
      role: "crew",
      memberId: "member_eden",
    })
    expect(resolveSession(raw, directory)).toEqual({
      session: fallback,
      shouldWrite: true,
    })
  })

  it("restores the default when the member role disagrees", () => {
    const raw = envelope({
      vesselId: "vessel_horizon",
      role: "crew",
      memberId: "member_blake",
    })
    expect(resolveSession(raw, directory)).toEqual({
      session: fallback,
      shouldWrite: true,
    })
  })

  it("keeps an empty crew session on MV Aurora", () => {
    const session: SessionState = {
      vesselId: "vessel_aurora",
      role: "crew",
      memberId: null,
    }
    expect(resolveSession(envelope(session), directory)).toEqual({
      session,
      shouldWrite: false,
    })
  })

  it("replaces an empty crew session on MV Horizon", () => {
    const raw = envelope({
      vesselId: "vessel_horizon",
      role: "crew",
      memberId: null,
    })
    expect(resolveSession(raw, directory)).toEqual({
      session: fallback,
      shouldWrite: true,
    })
  })

  it("keeps an admin on a vessel they are not assigned to", () => {
    const session: SessionState = {
      vesselId: "vessel_aurora",
      role: "admin",
      memberId: "member_frank",
    }
    expect(resolveSession(envelope(session), directory)).toEqual({
      session,
      shouldWrite: false,
    })
  })

  it("keeps a saved Drew Patel session", () => {
    const session: SessionState = {
      vesselId: "vessel_aurora",
      role: "captain",
      memberId: "member_drew",
    }
    expect(resolveSession(envelope(session), directory)).toEqual({
      session,
      shouldWrite: false,
    })
  })
})

function memoryStorage(): SessionStorage {
  const values = new Map<string, string>()
  return {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value)
    },
    removeItem: (name) => {
      values.delete(name)
    },
  }
}

describe("createSessionStore actions", () => {
  function store() {
    return createSessionStore({ ...directory, storage: memoryStorage() })
  }

  it("resolves a new store to MV Horizon, Admin, and Avery Chen", () => {
    expect(store().getState()).toMatchObject(fallback)
  })

  it("keeps the captain when MV Aurora has one", () => {
    const session = store()
    session.getState().setRole("captain")
    session.getState().setVesselId("vessel_aurora")
    expect(session.getState()).toMatchObject({
      vesselId: "vessel_aurora",
      role: "captain",
      memberId: "member_drew",
    })
  })

  it("selects the first captain when MV Aurora has no crew", () => {
    const session = store()
    session.getState().setRole("crew")
    session.getState().setVesselId("vessel_aurora")
    expect(session.getState()).toMatchObject({
      vesselId: "vessel_aurora",
      role: "captain",
      memberId: "member_drew",
    })
  })

  it("omits roles with no members for the selected vessel", () => {
    const session = store()
    expect(session.getState().roleOptions()).toEqual(["admin", "captain", "crew"])
    session.getState().setVesselId("vessel_aurora")
    expect(session.getState().roleOptions()).toEqual(["admin", "captain"])
    session.getState().setRole("crew")
    expect(session.getState().role).toBe("admin")
  })

  it("keeps the admin when the vessel changes", () => {
    const session = store()
    session.getState().setMemberId("member_frank")
    session.getState().setVesselId("vessel_aurora")
    expect(session.getState()).toMatchObject({
      vesselId: "vessel_aurora",
      role: "admin",
      memberId: "member_frank",
    })
    expect(session.getState().memberOptions().map((member) => member.id)).toEqual([
      "member_avery",
      "member_frank",
    ])
  })

  it("selects the first captain on MV Horizon", () => {
    const session = store()
    session.getState().setRole("captain")
    expect(session.getState().memberId).toBe("member_blake")
  })

  it("ignores selecting a role that is unavailable for the vessel", () => {
    const session = store()
    session.getState().setVesselId("vessel_aurora")
    session.getState().setRole("crew")
    expect(session.getState()).toMatchObject({
      vesselId: "vessel_aurora",
      role: "admin",
      memberId: "member_avery",
    })
  })

  it("hides inactive vessels and inactive members", () => {
    const session = store()
    expect(session.getState().vesselOptions().map((vessel) => vessel.id)).toEqual([
      "vessel_horizon",
      "vessel_aurora",
    ])
    session.getState().setRole("crew")
    expect(session.getState().memberOptions().map((member) => member.id)).toEqual([
      "member_casey",
      "member_harper",
      "member_ivan",
      "member_kai",
    ])
  })

  it("removes a deactivated vessel from the session choices", () => {
    const session = store()
    session.getState().setDirectory({
      ...directory,
      vessels: directory.vessels.map((vessel) =>
        vessel.id === "vessel_aurora" ? { ...vessel, active: false } : vessel,
      ),
    })
    expect(session.getState().vesselOptions().map((vessel) => vessel.id)).toEqual([
      "vessel_horizon",
    ])
    expect(session.getState().vesselId).toBe("vessel_horizon")
  })

  it("removes a deactivated user from the session choices", () => {
    const session = store()
    session.getState().setDirectory({
      ...directory,
      members: directory.members.map((member) =>
        member.id === "member_avery" ? { ...member, active: false } : member,
      ),
    })
    expect(session.getState().memberOptions().map((member) => member.id)).toEqual([
      "member_frank",
    ])
    expect(session.getState().memberId).toBe("member_frank")
  })

  it("moves off a deactivated vessel to a role that vessel still has", () => {
    const session = store()
    session.getState().setRole("captain")
    session.getState().setDirectory({
      ...directory,
      vessels: directory.vessels.map((vessel) =>
        vessel.id === "vessel_horizon" ? { ...vessel, active: false } : vessel,
      ),
    })
    expect(session.getState()).toMatchObject({
      vesselId: "vessel_aurora",
      role: "captain",
      memberId: "member_drew",
    })
  })

  it("ignores an inactive vessel id", () => {
    const session = store()
    session.getState().setVesselId("vessel_retired")
    expect(session.getState()).toMatchObject(fallback)
  })

  it("ignores a member who is not a current option", () => {
    const session = store()
    session.getState().setMemberId("member_eden")
    expect(session.getState().memberId).toBe("member_avery")
  })

  it("ignores a role outside the union", () => {
    const session = store()
    session.getState().setRole("passenger" as "admin")
    expect(session.getState()).toMatchObject(fallback)
  })
})

describe("createSessionStore persistence", () => {
  it("writes the default envelope when storage is empty", async () => {
    const storage = memoryStorage()
    const session = createSessionStore({ ...directory, storage })
    await session.persist.rehydrate()
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBe(envelope(defaultSession(directory)))
    expect(session.getState().hasHydrated).toBe(true)
    expect(session.getState()).toMatchObject(fallback)
  })

  it("keeps the in-memory session when setItem throws", () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new Error("quota")
    }
    const session = createSessionStore({ ...directory, storage })
    session.getState().setRole("captain")
    expect(session.getState()).toMatchObject({
      vesselId: "vessel_horizon",
      role: "captain",
      memberId: "member_blake",
    })
  })

  it("keeps the default in memory when the restore write throws", async () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new Error("quota")
    }
    const session = createSessionStore({ ...directory, storage })
    await session.persist.rehydrate()
    expect(session.getState()).toMatchObject(fallback)
    expect(session.getState().hasHydrated).toBe(true)
  })

  it("finishes hydration with the default when getItem throws", async () => {
    const storage = memoryStorage()
    storage.getItem = () => {
      throw new Error("denied")
    }
    const session = createSessionStore({ ...directory, storage })
    await session.persist.rehydrate()
    expect(session.getState().hasHydrated).toBe(true)
    expect(session.getState()).toMatchObject(fallback)
  })

  it("keeps a saved Drew Patel session without rewriting storage", async () => {
    const saved: SessionState = {
      vesselId: "vessel_aurora",
      role: "captain",
      memberId: "member_drew",
    }
    const storage = memoryStorage()
    const raw = envelope(saved)
    storage.setItem(SESSION_STORAGE_KEY, raw)
    let writes = 0
    const write = storage.setItem
    storage.setItem = (name, value) => {
      writes += 1
      write(name, value)
    }
    const session = createSessionStore({ ...directory, storage })
    await session.persist.rehydrate()
    expect(session.getState()).toMatchObject(saved)
    expect(writes).toBe(0)
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBe(raw)
  })
})

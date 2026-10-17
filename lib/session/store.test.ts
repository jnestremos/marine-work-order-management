import { describe, expect, it } from "vitest"
import { marineFixture } from "@/lib/fixtures/marine"
import type { SessionStorage } from "@/lib/session/types"
import { createSessionStore, resolveSession, type SessionState } from "@/lib/session/store"

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
    expect(resolveSession(null, marineFixture)).toEqual({
      session: fallback,
      shouldWrite: true,
    })
  })

  it("restores the default for malformed JSON", () => {
    expect(resolveSession("{not json", marineFixture)).toEqual({
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
    expect(resolveSession(raw, marineFixture)).toEqual({
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
    expect(resolveSession(raw, marineFixture)).toEqual({
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
    expect(resolveSession(raw, marineFixture)).toEqual({
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
    expect(resolveSession(envelope(session), marineFixture)).toEqual({
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
    expect(resolveSession(raw, marineFixture)).toEqual({
      session: fallback,
      shouldWrite: true,
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
    return createSessionStore({ ...marineFixture, storage: memoryStorage() })
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

  it("selects Avery Chen when MV Aurora has no crew", () => {
    const session = store()
    session.getState().setRole("crew")
    session.getState().setVesselId("vessel_aurora")
    expect(session.getState()).toMatchObject({
      vesselId: "vessel_aurora",
      role: "admin",
      memberId: "member_avery",
    })
  })

  it("selects the first captain on MV Horizon", () => {
    const session = store()
    session.getState().setRole("captain")
    expect(session.getState().memberId).toBe("member_blake")
  })

  it("clears the member when the role has nobody", () => {
    const session = store()
    session.getState().setVesselId("vessel_aurora")
    session.getState().setRole("crew")
    expect(session.getState().memberId).toBeNull()
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
    ])
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

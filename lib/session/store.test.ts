import { describe, expect, it } from "vitest"
import { marineFixture } from "@/lib/fixtures/marine"
import { resolveSession, type SessionState } from "@/lib/session/store"

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

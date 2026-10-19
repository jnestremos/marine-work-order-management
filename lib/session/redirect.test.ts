import { describe, expect, it } from "vitest"
import { redirectFor, roleFromSessionCookie } from "@/lib/session/redirect"

const captain = JSON.stringify({
  state: { vesselId: "vessel_horizon", role: "captain", memberId: "member_blake" },
  version: 0,
})

describe("roleFromSessionCookie", () => {
  it("uses admin when the cookie is missing or unreadable", () => {
    expect(roleFromSessionCookie(undefined)).toBe("admin")
    expect(roleFromSessionCookie("{")).toBe("admin")
    expect(roleFromSessionCookie(JSON.stringify({ state: { role: "passenger" } }))).toBe("admin")
  })

  it("reads the role from the session envelope", () => {
    expect(roleFromSessionCookie(captain)).toBe("captain")
  })
})

describe("redirectFor", () => {
  it("sends the root path to that role's home", () => {
    expect(redirectFor("/", "crew")).toBe("/crew/work-orders")
  })

  it("sends another role's pages home", () => {
    expect(redirectFor("/admin/users", "captain")).toBe("/captain/work-orders")
    expect(redirectFor("/crew/assignments", "admin")).toBe("/admin/users")
  })

  it("leaves the current role's pages alone", () => {
    expect(redirectFor("/captain/crew", "captain")).toBeNull()
    expect(redirectFor("/captain/work-orders", "captain")).toBeNull()
  })
})

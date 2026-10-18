import { describe, expect, it } from "vitest"
import {
  assignmentFormSchema,
  userFormSchema,
  vesselFormSchema,
} from "@/lib/admin/schema"

function fieldMessage(
  result: { success: true } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
): string | undefined {
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe("userFormSchema", () => {
  it("rejects a whitespace-only first or last name", () => {
    const result = userFormSchema.safeParse({
      firstName: "   ",
      lastName: " ",
      role: "crew",
    })
    expect(result.success).toBe(false)
    expect(fieldMessage(result, "firstName")).toBe("First name is required")
    expect(fieldMessage(result, "lastName")).toBe("Last name is required")
  })

  it("trims a padded first and last name", () => {
    const result = userFormSchema.safeParse({
      firstName: "  Ada  ",
      lastName: "  Lovelace  ",
      role: "crew",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.firstName).toBe("Ada")
      expect(result.data.lastName).toBe("Lovelace")
    }
  })

  it("rejects an empty role", () => {
    const result = userFormSchema.safeParse({
      firstName: "Ada",
      lastName: "Lovelace",
      role: "",
    })
    expect(fieldMessage(result, "role")).toBe("Role is required")
  })

  it("rejects a role outside admin, captain, and crew", () => {
    const result = userFormSchema.safeParse({
      firstName: "Ada",
      lastName: "Lovelace",
      role: "pilot",
    })
    expect(fieldMessage(result, "role")).toBe("Role is required")
  })
})

describe("vesselFormSchema", () => {
  it("rejects a whitespace-only name", () => {
    const result = vesselFormSchema.safeParse({ name: " " })
    expect(fieldMessage(result, "name")).toBe("Name is required")
  })

  it("trims a padded name", () => {
    const result = vesselFormSchema.safeParse({ name: "  MV North  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("MV North")
    }
  })
})

describe("assignmentFormSchema", () => {
  it("rejects an empty user id", () => {
    const result = assignmentFormSchema.safeParse({
      memberId: "",
      vesselId: "vessel_horizon",
    })
    expect(fieldMessage(result, "memberId")).toBe("User is required")
  })

  it("rejects an empty vessel id", () => {
    const result = assignmentFormSchema.safeParse({
      memberId: "member_avery",
      vesselId: "",
    })
    expect(fieldMessage(result, "vesselId")).toBe("Vessel is required")
  })
})

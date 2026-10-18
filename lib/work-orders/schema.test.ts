import { describe, expect, it } from "vitest"
import { workOrderFormSchema } from "@/lib/work-orders/schema"

function fieldMessage(
  result: { success: true } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
): string | undefined {
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe("workOrderFormSchema", () => {
  it("rejects an empty title, issue, and crew choice", () => {
    const result = workOrderFormSchema.safeParse({
      title: "   ",
      issue: " ",
      assigneeId: "",
    })
    expect(result.success).toBe(false)
    expect(fieldMessage(result, "title")).toBe("Title is required")
    expect(fieldMessage(result, "issue")).toBe("Issue is required")
    expect(fieldMessage(result, "assigneeId")).toBe("Crew is required")
  })

  it("trims a title and issue", () => {
    const result = workOrderFormSchema.safeParse({
      title: "  Pump seal  ",
      issue: "  Leaking at the flange  ",
      assigneeId: "member_casey",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe("Pump seal")
      expect(result.data.issue).toBe("Leaking at the flange")
      expect(result.data.assigneeId).toBe("member_casey")
    }
  })
})

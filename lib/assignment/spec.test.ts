import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { assignmentFormSchema, userFormSchema, vesselFormSchema } from "@/lib/admin/schema"
import { ROLE_HOME, ROLE_NAV } from "@/lib/navigation"
import { redirectFor } from "@/lib/session/redirect"
import { activeVessels, membersFor, rolesFor } from "@/lib/session/store"
import { ROLES, type MarineFixture } from "@/lib/session/types"
import { workOrderFormSchema } from "@/lib/work-orders/schema"
import { rejectionReasonBlock } from "@/lib/work-orders/review"
import {
  WORK_ORDER_STATUS_LABELS,
  type WorkOrder,
  type WorkOrderStatus,
} from "@/lib/work-orders/types"

const directory: MarineFixture = {
  vessels: [
    { id: "v-horizon", name: "MV Horizon", active: true },
    { id: "v-aurora", name: "MV Aurora", active: true },
    { id: "v-retired", name: "MV Retired", active: false },
  ],
  members: [
    { id: "m-avery", firstName: "Avery", lastName: "Chen", role: "admin", active: true },
    { id: "m-blake", firstName: "Blake", lastName: "Ortiz", role: "captain", active: true },
    { id: "m-casey", firstName: "Casey", lastName: "Nguyen", role: "crew", active: true },
    { id: "m-drew", firstName: "Drew", lastName: "Patel", role: "captain", active: true },
    { id: "m-eden", firstName: "Eden", lastName: "Brooks", role: "crew", active: false },
    { id: "m-harper", firstName: "Harper", lastName: "Singh", role: "crew", active: true },
  ],
  assignments: [
    { memberId: "m-blake", vesselId: "v-horizon" },
    { memberId: "m-casey", vesselId: "v-horizon" },
    { memberId: "m-drew", vesselId: "v-aurora" },
    { memberId: "m-harper", vesselId: "v-horizon" },
  ],
  serviceRecords: [],
  seaServices: [],
}

describe("assignment: mock authentication session", () => {
  it("exposes Admin, Captain, and Crew roles for the role filter", () => {
    expect([...ROLES]).toEqual(["admin", "captain", "crew"])
  })

  it("scopes the vessel selector to active vessels", () => {
    expect(activeVessels(directory).map((vessel) => vessel.name)).toEqual([
      "MV Horizon",
      "MV Aurora",
    ])
  })

  it("populates the member switcher from the selected vessel and role", () => {
    expect(membersFor(directory, "v-horizon", "captain").map((member) => member.id)).toEqual([
      "m-blake",
    ])
    expect(membersFor(directory, "v-horizon", "crew").map((member) => member.id)).toEqual([
      "m-casey",
      "m-harper",
    ])
    expect(membersFor(directory, "v-aurora", "crew")).toEqual([])
  })

  it("limits role options to roles with members for the selected vessel", () => {
    expect(rolesFor(directory, "v-horizon")).toEqual(["admin", "captain", "crew"])
    expect(rolesFor(directory, "v-aurora")).toEqual(["admin", "captain"])
  })

  it("lets admins appear for every vessel without an assignment", () => {
    expect(membersFor(directory, "v-aurora", "admin").map((member) => member.id)).toEqual([
      "m-avery",
    ])
  })

  it("sends each role to its own dashboard home", () => {
    expect(ROLE_HOME).toEqual({
      admin: "/admin/users",
      captain: "/captain/work-orders",
      crew: "/crew/work-orders",
    })
    expect(redirectFor("/admin/users", "crew")).toBe("/crew/work-orders")
    expect(redirectFor("/captain/work-orders", "admin")).toBe("/admin/users")
  })
})

describe("assignment: admin management surfaces", () => {
  it("requires user first name, last name, and role", () => {
    expect(userFormSchema.safeParse({ firstName: "", lastName: "Chen", role: "admin" }).success).toBe(
      false,
    )
    expect(
      userFormSchema.safeParse({ firstName: "Avery", lastName: "Chen", role: "admin" }).success,
    ).toBe(true)
  })

  it("requires a vessel name", () => {
    expect(vesselFormSchema.safeParse({ name: "  " }).success).toBe(false)
    expect(vesselFormSchema.safeParse({ name: "MV Horizon" }).success).toBe(true)
  })

  it("requires assignment member and vessel", () => {
    expect(assignmentFormSchema.safeParse({ memberId: "", vesselId: "v-horizon" }).success).toBe(
      false,
    )
    expect(
      assignmentFormSchema.safeParse({ memberId: "m-blake", vesselId: "v-horizon" }).success,
    ).toBe(true)
  })

  it("lists admin pages for users, vessels, and assignments", () => {
    expect(ROLE_NAV.admin.map((item) => item.href)).toEqual(
      expect.arrayContaining(["/admin/users", "/admin/vessels", "/admin/assignments"]),
    )
  })
})

describe("assignment: work order lifecycle", () => {
  it("labels the required Open, In Progress, and Done statuses", () => {
    const required: WorkOrderStatus[] = ["open", "in_progress", "done"]
    expect(required.map((status) => WORK_ORDER_STATUS_LABELS[status])).toEqual([
      "Open",
      "In Progress",
      "Done",
    ])
  })

  it("requires title, issue, and crew assignee on create", () => {
    expect(
      workOrderFormSchema.safeParse({ title: "", issue: "leak", assigneeId: "m-casey" }).success,
    ).toBe(false)
    expect(
      workOrderFormSchema.safeParse({
        title: "Bilge pump",
        issue: "Seal weeps",
        assigneeId: "m-casey",
      }).success,
    ).toBe(true)
  })

  it("models work order id, title, issue, optional solutions, and status", () => {
    const order: WorkOrder = {
      id: "wo-1",
      code: "WO-1001",
      vesselId: "v-horizon",
      title: "Nav light",
      issue: "Stays dark",
      solutions: [],
      status: "open",
      assigneeId: "m-casey",
      createdById: "m-blake",
    }
    expect(order).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      issue: expect.any(String),
      solutions: expect.any(Array),
      status: "open",
    })
  })

  it("exposes captain and crew work-order homes", () => {
    expect(ROLE_NAV.captain.some((item) => item.href === "/captain/work-orders")).toBe(true)
    expect(ROLE_NAV.crew.some((item) => item.href === "/crew/work-orders")).toBe(true)
  })

  it("requires a rejection reason when sending work back to crew", () => {
    expect(rejectionReasonBlock(undefined)).toBe("A rejection reason is required")
    expect(rejectionReasonBlock("   ")).toBe("A rejection reason is required")
    expect(rejectionReasonBlock("Replace the connector")).toBeNull()
  })

  it("keeps Open, In Progress, and Done as the crew-facing status labels", () => {
    expect(WORK_ORDER_STATUS_LABELS.open).toBe("Open")
    expect(WORK_ORDER_STATUS_LABELS.in_progress).toBe("In Progress")
    expect(WORK_ORDER_STATUS_LABELS.done).toBe("Done")
  })
})

describe("assignment: browser Supabase client", () => {
  const root = path.resolve(__dirname, "../..")

  it("uses the browser supabase-js client with publishable env keys", () => {
    const client = readFileSync(path.join(root, "lib/supabase/client.ts"), "utf8")
    expect(client).toMatch(/@supabase\/supabase-js/)
    expect(client).toMatch(/NEXT_PUBLIC_SUPABASE_URL/)
    expect(client).toMatch(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)
    expect(client).toMatch(/x-marine-member-id/)
    expect(client).toMatch(/x-marine-role/)
    expect(client).toMatch(/x-marine-vessel-id/)
  })

  it("loads and mutates marine data through the browser API module", () => {
    const api = readFileSync(path.join(root, "lib/supabase/api.ts"), "utf8")
    expect(api).toMatch(/from\("work_orders"\)/)
    expect(api).toMatch(/from\("members"\)/)
    expect(api).toMatch(/from\("work_order_solutions"\)/)
    expect(api).toMatch(/review_note/)
    expect(api).toMatch(/export async function loadMembers/)
    expect(api).toMatch(/export async function loadWorkOrders/)
  })

  it("fetches marine resources on demand with TanStack Query", () => {
    const queries = readFileSync(
      path.join(root, "components/data/marine-queries.ts"),
      "utf8",
    )
    const provider = readFileSync(
      path.join(root, "components/data/MarineProvider.tsx"),
      "utf8",
    )
    expect(queries).toMatch(/@tanstack\/react-query/)
    expect(queries).toMatch(/useWorkOrdersQuery/)
    expect(queries).toMatch(/useMembersQuery/)
    expect(provider).toMatch(/QueryClientProvider/)
    expect(provider).not.toMatch(/loadMarineData/)
  })

  it("ships session bar dropdowns for vessel, role, and member", () => {
    expect(existsSync(path.join(root, "components/session/SessionBar.tsx"))).toBe(true)
    expect(existsSync(path.join(root, "components/session/VesselSelect.tsx"))).toBe(true)
    expect(existsSync(path.join(root, "components/session/RoleSelect.tsx"))).toBe(true)
    expect(existsSync(path.join(root, "components/session/MemberSelect.tsx"))).toBe(true)
  })

  it("keeps row-level security migrations in the repository", () => {
    const migrations = path.join(root, "supabase/migrations")
    const files = readFileSync(
      path.join(migrations, "20261019062749_session_rls.sql"),
      "utf8",
    )
    expect(files).toMatch(/enable row level security|create policy/i)
    expect(files).toMatch(/set_marine_session/)
  })
})

describe("assignment: documentation deliverables", () => {
  const root = path.resolve(__dirname, "../..")

  it("includes a schema.sql database schema document", () => {
    const schemaPath = path.join(root, "schema.sql")
    expect(existsSync(schemaPath)).toBe(true)
    const schema = readFileSync(schemaPath, "utf8")
    for (const table of [
      "members",
      "vessels",
      "assignments",
      "work_orders",
      "work_order_solutions",
    ]) {
      expect(schema).toMatch(new RegExp(`\\b${table}\\b`))
    }
  })

  it("documents the ERD in README.md", () => {
    const readme = readFileSync(path.join(root, "README.md"), "utf8")
    expect(readme).toMatch(/erDiagram|Entity Relationship|## ERD/i)
    expect(readme).toMatch(/members|vessels|work_orders/)
  })

  it("lists the public GitHub repository in the submission table", () => {
    const readme = readFileSync(path.join(root, "README.md"), "utf8")
    expect(readme).toMatch(/## Submission/)
    expect(readme).toMatch(/https:\/\/github\.com\/jnestremos\/marine-work-order-management/)
    expect(readme).toMatch(/\|\s*Live production URL\s*\|/)
  })

  it("records a live deployment URL when LIVE_URL is provided", () => {
    const live = process.env.LIVE_URL?.trim()
    if (!live) {
      return
    }
    const readme = readFileSync(path.join(root, "README.md"), "utf8")
    expect(live).toMatch(/^https:\/\//)
    expect(readme).toContain(live)
    expect(live).toMatch(/\.(workers\.dev|pages\.dev|vercel\.app|netlify\.app)(\/|$)/i)
  })
})

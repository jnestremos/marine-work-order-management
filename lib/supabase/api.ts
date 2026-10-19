import { supabase } from "@/lib/supabase/client"
import type {
  Assignment,
  MarineFixture,
  Member,
  Role,
  SeaService,
  ServiceRecord,
  Vessel,
} from "@/lib/session/types"
import { rejectionReasonBlock } from "@/lib/work-orders/review"
import type { WorkOrder, WorkOrderSolution, WorkOrderStatus } from "@/lib/work-orders/types"

function failure(error: { message: string } | null): string | null {
  return error ? error.message : null
}

type MemberRow = {
  id: string
  first_name: string
  last_name: string
  role: Role
  active: boolean
}

type VesselRow = { id: string; name: string; active: boolean }
type AssignmentRow = { member_id: string; vessel_id: string }
type ServiceRow = {
  id: string
  member_id: string
  vessel_id: string
  role: Role
  start_date: string
  end_date: string | null
}
type SeaRow = {
  id: string
  member_id: string
  vessel_id: string
  role: Role
  sign_on_date: string
  sign_on_port: string
  sign_off_date: string
  sign_off_port: string
  status: SeaService["status"]
}
type SolutionRow = {
  id: string
  body: string
  status: WorkOrderSolution["status"]
  posted_at: string
  review_note: string | null
}
type OrderRow = {
  id: string
  code: string
  vessel_id: string
  title: string
  issue: string
  status: WorkOrderStatus
  assignee_id: string
  created_by_id: string
  work_order_solutions: SolutionRow[] | null
}

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    active: row.active,
  }
}

function toVessel(row: VesselRow): Vessel {
  return { id: row.id, name: row.name, active: row.active }
}

function toAssignment(row: AssignmentRow): Assignment {
  return { memberId: row.member_id, vesselId: row.vessel_id }
}

function toService(row: ServiceRow): ServiceRecord {
  return {
    id: row.id,
    memberId: row.member_id,
    vesselId: row.vessel_id,
    role: row.role,
    startDate: row.start_date,
    endDate: row.end_date ?? "",
  }
}

function toSea(row: SeaRow): SeaService {
  return {
    id: row.id,
    memberId: row.member_id,
    vesselId: row.vessel_id,
    role: row.role,
    signOnDate: row.sign_on_date,
    signOnPort: row.sign_on_port,
    signOffDate: row.sign_off_date,
    signOffPort: row.sign_off_port,
    status: row.status,
  }
}

function toOrder(row: OrderRow): WorkOrder {
  const solutions = [...(row.work_order_solutions ?? [])]
    .sort((left, right) => left.posted_at.localeCompare(right.posted_at))
    .map((solution) => ({
      id: solution.id,
      text: solution.body,
      status: solution.status,
      postedAt: solution.posted_at,
      reviewNote: solution.review_note ?? undefined,
    }))
  return {
    id: row.id,
    code: row.code,
    vesselId: row.vessel_id,
    title: row.title,
    issue: row.issue,
    status: row.status,
    assigneeId: row.assignee_id,
    createdById: row.created_by_id,
    solutions,
  }
}

export async function loadSessionChoices(): Promise<MarineFixture> {
  const { data, error } = await supabase.rpc("session_choices")
  if (error) {
    throw new Error(error.message)
  }
  const catalog = data as {
    vessels: Vessel[]
    members: Member[]
    assignments: Assignment[]
  }
  return {
    vessels: catalog.vessels ?? [],
    members: catalog.members ?? [],
    assignments: catalog.assignments ?? [],
    serviceRecords: [],
    seaServices: [],
  }
}

async function requireRows<T>(result: { data: T[] | null; error: { message: string } | null }) {
  if (result.error) {
    throw new Error(result.error.message)
  }
  return result.data ?? []
}

export async function loadMembers(): Promise<Member[]> {
  const rows = await requireRows(
    await supabase.from("members").select("id, first_name, last_name, role, active"),
  )
  return (rows as MemberRow[]).map(toMember)
}

export async function loadVessels(): Promise<Vessel[]> {
  const rows = await requireRows(await supabase.from("vessels").select("id, name, active"))
  return (rows as VesselRow[]).map(toVessel)
}

export async function loadAssignments(): Promise<Assignment[]> {
  const rows = await requireRows(
    await supabase.from("assignments").select("member_id, vessel_id"),
  )
  return (rows as AssignmentRow[]).map(toAssignment)
}

export async function loadServiceRecords(): Promise<ServiceRecord[]> {
  const rows = await requireRows(
    await supabase
      .from("service_records")
      .select("id, member_id, vessel_id, role, start_date, end_date"),
  )
  return (rows as ServiceRow[]).map(toService)
}

export async function loadSeaServices(): Promise<SeaService[]> {
  const rows = await requireRows(
    await supabase
      .from("sea_services")
      .select(
        "id, member_id, vessel_id, role, sign_on_date, sign_on_port, sign_off_date, sign_off_port, status",
      ),
  )
  return (rows as SeaRow[]).map(toSea)
}

export async function loadWorkOrders(): Promise<WorkOrder[]> {
  const rows = await requireRows(
    await supabase.from("work_orders").select(
      "id, code, vessel_id, title, issue, status, assignee_id, created_by_id, work_order_solutions(id, body, status, posted_at, review_note)",
    ),
  )
  return (rows as OrderRow[]).map(toOrder)
}

export async function saveUser(input: {
  id?: string
  firstName: string
  lastName: string
  role: Role
  serviceRecords: ServiceRecord[]
}): Promise<string | null> {
  if (input.id) {
    const updated = await supabase
      .from("members")
      .update({
        first_name: input.firstName,
        last_name: input.lastName,
        role: input.role,
      })
      .eq("id", input.id)
    const message = failure(updated.error)
    if (message) {
      return message
    }
    if (input.role !== "admin") {
      const existing = await supabase.from("service_records").select("id").eq("member_id", input.id)
      if (existing.error) {
        return existing.error.message
      }
      const nextIds = new Set(input.serviceRecords.map((record) => record.id))
      const removed = ((existing.data ?? []) as { id: string }[])
        .map((record) => record.id)
        .filter((id) => !nextIds.has(id))
      if (removed.length > 0) {
        const deleted = await supabase.from("service_records").delete().in("id", removed)
        const deletedMessage = failure(deleted.error)
        if (deletedMessage) {
          return deletedMessage
        }
      }
      if (input.serviceRecords.length > 0) {
        const saved = await supabase.from("service_records").upsert(
          input.serviceRecords.map((record) => ({
            id: record.id,
            member_id: input.id,
            vessel_id: record.vesselId,
            role: record.role,
            start_date: record.startDate,
            end_date: record.endDate || null,
          })),
        )
        return failure(saved.error)
      }
    }
    return null
  }
  const inserted = await supabase.from("members").insert({
    first_name: input.firstName,
    last_name: input.lastName,
    role: input.role,
  })
  return failure(inserted.error)
}

export async function setMemberActive(memberId: string, active: boolean): Promise<string | null> {
  const result = await supabase.from("members").update({ active }).eq("id", memberId)
  return failure(result.error)
}

export async function saveVessel(input: { id?: string; name: string }): Promise<string | null> {
  if (input.id) {
    const result = await supabase.from("vessels").update({ name: input.name }).eq("id", input.id)
    return failure(result.error)
  }
  const result = await supabase.from("vessels").insert({ name: input.name })
  return failure(result.error)
}

export async function setVesselActive(vesselId: string, active: boolean): Promise<string | null> {
  const result = await supabase.from("vessels").update({ active }).eq("id", vesselId)
  return failure(result.error)
}

export async function addAssignment(input: {
  memberId: string
  vesselId: string
}): Promise<string | null> {
  const result = await supabase.from("assignments").insert({
    member_id: input.memberId,
    vessel_id: input.vesselId,
  })
  return failure(result.error)
}

export async function removeAssignment(memberId: string, vesselId: string): Promise<string | null> {
  const result = await supabase
    .from("assignments")
    .delete()
    .eq("member_id", memberId)
    .eq("vessel_id", vesselId)
  return failure(result.error)
}

export async function saveSeaService(input: {
  id?: string
  memberId: string
  vesselId: string
  role: Role
  signOnDate: string
  signOnPort: string
  signOffDate: string
  signOffPort: string
  createdById: string
}): Promise<string | null> {
  const row = {
    member_id: input.memberId,
    vessel_id: input.vesselId,
    role: input.role,
    sign_on_date: input.signOnDate,
    sign_on_port: input.signOnPort,
    sign_off_date: input.signOffDate,
    sign_off_port: input.signOffPort,
  }
  if (input.id) {
    const result = await supabase.from("sea_services").update(row).eq("id", input.id)
    return failure(result.error)
  }
  const result = await supabase.from("sea_services").insert({
    ...row,
    created_by_id: input.createdById,
    status: "pending",
  })
  return failure(result.error)
}

export async function setSeaServiceStatus(
  id: string,
  status: SeaService["status"],
): Promise<string | null> {
  const result = await supabase.from("sea_services").update({ status }).eq("id", id)
  return failure(result.error)
}

export async function removeSeaService(id: string): Promise<string | null> {
  const result = await supabase.from("sea_services").delete().eq("id", id)
  return failure(result.error)
}

export async function addWorkOrder(input: {
  vesselId: string
  title: string
  issue: string
  assigneeId: string
  createdById: string
}): Promise<string | null> {
  const result = await supabase.from("work_orders").insert({
    vessel_id: input.vesselId,
    title: input.title,
    issue: input.issue,
    assignee_id: input.assigneeId,
    created_by_id: input.createdById,
  })
  return failure(result.error)
}

export async function updateWorkOrder(
  id: string,
  input: { title: string; issue: string; assigneeId: string },
): Promise<string | null> {
  const result = await supabase
    .from("work_orders")
    .update({
      title: input.title,
      issue: input.issue,
      assignee_id: input.assigneeId,
    })
    .eq("id", id)
  return failure(result.error)
}

export async function reviewWorkOrder(
  id: string,
  status: "accepted" | "rejected",
  note?: string,
): Promise<string | null> {
  if (status === "rejected") {
    const blocked = rejectionReasonBlock(note)
    if (blocked) {
      return blocked
    }
    const reason = note!.trim()
    const latest = await supabase
      .from("work_order_solutions")
      .select("id")
      .eq("work_order_id", id)
      .order("posted_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latest.error) {
      return latest.error.message
    }
    if (!latest.data) {
      return "Accept or reject a work order only when it is done and the latest solution is pending"
    }
    const noted = await supabase
      .from("work_order_solutions")
      .update({ review_note: reason })
      .eq("id", latest.data.id)
    const notedMessage = failure(noted.error)
    if (notedMessage) {
      return notedMessage
    }
  }
  const result = await supabase.from("work_orders").update({ status }).eq("id", id)
  return failure(result.error)
}

export async function submitSolution(
  orderId: string,
  memberId: string,
  text: string,
): Promise<string | null> {
  const result = await supabase.from("work_order_solutions").insert({
    work_order_id: orderId,
    body: text,
    posted_by: memberId,
    status: "pending",
  })
  return failure(result.error)
}

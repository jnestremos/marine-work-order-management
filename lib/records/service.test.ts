import { describe, expect, it } from "vitest"
import {
  closeAssignedServiceRecords,
  closeServiceRecords,
  openServiceRecord,
  todayIsoDate,
} from "@/lib/records/service"
import type { ServiceRecord } from "@/lib/session/types"

const openRecord: ServiceRecord = {
  id: "service_blake_horizon",
  memberId: "member_blake",
  vesselId: "vessel_horizon",
  role: "captain",
  startDate: "2024-03-01",
  endDate: "",
}

describe("todayIsoDate", () => {
  it("formats the local calendar date", () => {
    expect(todayIsoDate(new Date(2026, 9, 19))).toBe("2026-10-19")
  })
})

describe("openServiceRecord", () => {
  it("adds a present appointment", () => {
    expect(
      openServiceRecord([], {
        id: "service_june_retired",
        memberId: "member_june",
        vesselId: "vessel_retired",
        role: "captain",
        startDate: "2026-10-19",
      }),
    ).toEqual([
      {
        id: "service_june_retired",
        memberId: "member_june",
        vesselId: "vessel_retired",
        role: "captain",
        startDate: "2026-10-19",
        endDate: "",
      },
    ])
  })

  it("leaves an open appointment in place", () => {
    expect(
      openServiceRecord([openRecord], {
        id: "service_new",
        memberId: "member_blake",
        vesselId: "vessel_horizon",
        role: "captain",
        startDate: "2026-10-19",
      }),
    ).toEqual([openRecord])
  })
})

describe("closeServiceRecords", () => {
  it("sets the end date on the open appointment for that vessel", () => {
    const closed = closeServiceRecords(
      [openRecord],
      "member_blake",
      "vessel_horizon",
      "2026-10-19",
    )
    expect(closed[0]?.endDate).toBe("2026-10-19")
  })

  it("leaves a closed appointment unchanged", () => {
    const closed = { ...openRecord, endDate: "2024-02-20" }
    expect(closeServiceRecords([closed], "member_blake", "vessel_horizon", "2026-10-19")).toEqual([
      closed,
    ])
  })
})

describe("closeAssignedServiceRecords", () => {
  it("closes open appointments for everyone leaving the vessel", () => {
    const records = closeAssignedServiceRecords(
      [
        openRecord,
        {
          id: "service_casey_horizon",
          memberId: "member_casey",
          vesselId: "vessel_horizon",
          role: "crew",
          startDate: "2023-11-01",
          endDate: "",
        },
        {
          id: "service_drew_aurora",
          memberId: "member_drew",
          vesselId: "vessel_aurora",
          role: "captain",
          startDate: "2022-04-01",
          endDate: "",
        },
      ],
      [
        { memberId: "member_blake", vesselId: "vessel_horizon" },
        { memberId: "member_casey", vesselId: "vessel_horizon" },
        { memberId: "member_drew", vesselId: "vessel_aurora" },
      ],
      "vessel_horizon",
      "2026-10-19",
    )
    expect(records.map((record) => record.endDate)).toEqual(["2026-10-19", "2026-10-19", ""])
  })
})

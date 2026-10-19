import { describe, expect, it } from "vitest"
import {
  isIsoDate,
  seaServiceFormSchema,
  serviceRecordFormSchema,
} from "@/lib/records/schema"

const serviceRecord = {
  vesselId: "vessel_horizon",
  role: "captain",
  startDate: "2024-03-01",
  endDate: "",
}

const seaService = {
  vesselId: "vessel_horizon",
  role: "captain",
  signOnDate: "2024-03-01",
  signOnPort: "Singapore",
  signOffDate: "2024-09-12",
  signOffPort: "Rotterdam",
}

function fieldMessage(
  result: { success: true } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
) {
  if (result.success) {
    return undefined
  }
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe("isIsoDate", () => {
  it("accepts real calendar days and rejects impossible ones", () => {
    expect(isIsoDate("2024-02-29")).toBe(true)
    expect(isIsoDate("2023-02-29")).toBe(false)
    expect(isIsoDate("2024-02-31")).toBe(false)
    expect(isIsoDate("2024-13-01")).toBe(false)
  })
})

describe("serviceRecordFormSchema", () => {
  it("allows a current appointment with no end date", () => {
    expect(serviceRecordFormSchema.safeParse(serviceRecord).success).toBe(true)
  })

  it("allows an end date on the same calendar day as the start date", () => {
    expect(
      serviceRecordFormSchema.safeParse({
        ...serviceRecord,
        endDate: "2024-03-01",
      }).success,
    ).toBe(true)
  })

  it("rejects an end date before the start date", () => {
    const result = serviceRecordFormSchema.safeParse({
      ...serviceRecord,
      endDate: "2024-02-01",
    })
    expect(fieldMessage(result, "endDate")).toBe("End date must be on or after the start date")
  })

  it("rejects a non-existent calendar day on start and end", () => {
    expect(
      fieldMessage(
        serviceRecordFormSchema.safeParse({
          ...serviceRecord,
          startDate: "2024-02-31",
        }),
        "startDate",
      ),
    ).toBe("Enter a valid calendar date")
    expect(
      fieldMessage(
        serviceRecordFormSchema.safeParse({
          ...serviceRecord,
          endDate: "2024-04-31",
        }),
        "endDate",
      ),
    ).toBe("Enter a valid calendar date")
  })

  it("requires a role", () => {
    const result = serviceRecordFormSchema.safeParse({
      ...serviceRecord,
      role: "",
    })
    expect(fieldMessage(result, "role")).toBe("Role is required")
  })
})

describe("seaServiceFormSchema", () => {
  it("accepts a completed voyage", () => {
    const result = seaServiceFormSchema.safeParse({
      ...seaService,
      signOnPort: "  Singapore  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.signOnPort).toBe("Singapore")
    }
  })

  it("allows sign-off on the same calendar day as sign-on", () => {
    expect(
      seaServiceFormSchema.safeParse({
        ...seaService,
        signOffDate: "2024-03-01",
      }).success,
    ).toBe(true)
  })

  it("rejects a sign-off before sign-on", () => {
    const result = seaServiceFormSchema.safeParse({
      ...seaService,
      signOffDate: "2024-02-01",
    })
    expect(fieldMessage(result, "signOffDate")).toBe(
      "Sign-off date must be on or after the sign-on date",
    )
  })

  it("rejects non-existent calendar days on sign-on and sign-off", () => {
    expect(
      fieldMessage(
        seaServiceFormSchema.safeParse({
          ...seaService,
          signOnDate: "2024-02-31",
        }),
        "signOnDate",
      ),
    ).toBe("Enter a valid calendar date")
    expect(
      fieldMessage(
        seaServiceFormSchema.safeParse({
          ...seaService,
          signOffDate: "2024-04-31",
        }),
        "signOffDate",
      ),
    ).toBe("Enter a valid calendar date")
  })

  it("requires both ports", () => {
    const result = seaServiceFormSchema.safeParse({
      ...seaService,
      signOnPort: "",
      signOffPort: " ",
    })
    expect(fieldMessage(result, "signOnPort")).toBe("Sign-on port is required")
    expect(fieldMessage(result, "signOffPort")).toBe("Sign-off port is required")
  })
})

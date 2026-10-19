import { z } from "zod"

/** True only for real calendar days in `YYYY-MM-DD` (rejects 2024-02-31, etc.). */
export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function requiredDate(requiredMessage: string, invalidMessage = "Enter a valid calendar date") {
  return z
    .string()
    .trim()
    .min(1, requiredMessage)
    .refine(isIsoDate, invalidMessage)
}

export const serviceRecordFormSchema = z
  .object({
    vesselId: z.string().min(1, "Vessel is required"),
    role: z.enum(["admin", "captain", "crew"], { error: "Role is required" }),
    startDate: requiredDate("Start date is required"),
    endDate: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (!data.endDate) {
      return
    }
    if (!isIsoDate(data.endDate)) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid calendar date",
        path: ["endDate"],
      })
      return
    }
    if (isIsoDate(data.startDate) && data.endDate < data.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "End date must be on or after the start date",
        path: ["endDate"],
      })
    }
  })

export const seaServiceFormSchema = z
  .object({
    vesselId: z.string().min(1, "Vessel is required"),
    role: z.enum(["admin", "captain", "crew"], { error: "Role is required" }),
    signOnDate: requiredDate("Sign-on date is required"),
    signOnPort: z.string().trim().min(1, "Sign-on port is required"),
    signOffDate: requiredDate("Sign-off date is required"),
    signOffPort: z.string().trim().min(1, "Sign-off port is required"),
  })
  .superRefine((data, ctx) => {
    if (isIsoDate(data.signOnDate) && isIsoDate(data.signOffDate) && data.signOffDate < data.signOnDate) {
      ctx.addIssue({
        code: "custom",
        message: "Sign-off date must be on or after the sign-on date",
        path: ["signOffDate"],
      })
    }
  })

export type ServiceRecordFormValues = z.infer<typeof serviceRecordFormSchema>
export type SeaServiceFormValues = z.infer<typeof seaServiceFormSchema>

export function formatRecordDate(value: string) {
  if (!value) {
    return "Present"
  }
  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

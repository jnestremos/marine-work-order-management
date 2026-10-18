import { z } from "zod"

export const personFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  role: z.enum(["admin", "captain", "crew"], { error: "Role is required" }),
})

export const vesselFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
})

export const assignmentFormSchema = z.object({
  memberId: z.string().min(1, "Person is required"),
  vesselId: z.string().min(1, "Vessel is required"),
})

export type PersonFormValues = z.infer<typeof personFormSchema>
export type VesselFormValues = z.infer<typeof vesselFormSchema>
export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>

export function fieldError(error: z.ZodError, field: string): string | null {
  const issue = error.issues.find((item) => item.path[0] === field)
  return issue?.message ?? null
}

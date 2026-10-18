import { z } from "zod"

export const workOrderFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  issue: z.string().trim().min(1, "Issue is required"),
  assigneeId: z.string().min(1, "Crew is required"),
})

export type WorkOrderFormValues = z.infer<typeof workOrderFormSchema>

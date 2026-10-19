"use client"

import { useEffect, useState } from "react"
import { HistoryIcon } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  SolutionHistory,
  SolutionHistoryDialog,
} from "@/components/work-orders/SolutionHistory"
import { workOrderFormSchema, type WorkOrderFormValues } from "@/lib/work-orders/schema"
import { WORK_ORDER_STATUS_LABELS, type WorkOrder } from "@/lib/work-orders/types"

const emptyWorkOrderForm: WorkOrderFormValues = {
  title: "",
  issue: "",
  assigneeId: "",
}

export function WorkOrderDialog({
  open,
  onOpenChange,
  order,
  description,
  readOnly = false,
  showStatus = false,
  showCrew = false,
  showSolution = false,
  crew = [],
  crewLocked = false,
  submitLabel,
  onSubmit,
  onAttest,
  onReject,
  reviewError,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: WorkOrder | null
  description: string
  readOnly?: boolean
  showStatus?: boolean
  showCrew?: boolean
  showSolution?: boolean
  crew?: { id: string; name: string }[]
  crewLocked?: boolean
  submitLabel?: string
  onSubmit?: (values: WorkOrderFormValues) => Promise<string | null> | string | null
  onAttest?: () => void
  onReject?: () => void
  reviewError?: string | null
}) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const crewItems = Object.fromEntries(crew.map((member) => [member.id, member.name]))
  const editable = !readOnly && Boolean(submitLabel)
  const canReview = order?.status === "done" && Boolean(onAttest || onReject)
  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: order
      ? { title: order.title, issue: order.issue, assigneeId: order.assigneeId }
      : emptyWorkOrderForm,
  })

  useEffect(() => {
    if (!open) {
      setHistoryOpen(false)
    }
  }, [open])

  function close() {
    onOpenChange(false)
  }

  async function onValid(values: WorkOrderFormValues) {
    const message = (await onSubmit?.(values)) ?? null
    if (message) {
      setError("root", { message })
      return
    }
    close()
  }

  function onInvalid() {
    clearErrors("root")
    if (showCrew && crew.length === 0) {
      clearErrors("assigneeId")
      setError("root", { message: "This vessel has no active crew" })
    }
  }

  const solution = order?.solutions.at(-1)?.text ?? ""
  const fields = (
    <>
      <div className="flex flex-col gap-1">
        <Label htmlFor="work-order-title">Title</Label>
        {editable ? (
          <Input
            id="work-order-title"
            aria-invalid={errors.title !== undefined}
            {...register("title")}
          />
        ) : (
          <Input id="work-order-title" value={order?.title ?? ""} disabled />
        )}
        {editable && errors.title ? (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="work-order-issue">Issue</Label>
        {editable ? (
          <Textarea
            id="work-order-issue"
            aria-invalid={errors.issue !== undefined}
            {...register("issue")}
          />
        ) : (
          <Textarea id="work-order-issue" value={order?.issue ?? ""} disabled />
        )}
        {editable && errors.issue ? (
          <p className="text-sm text-destructive">{errors.issue.message}</p>
        ) : null}
      </div>
      {showCrew ? (
        <div className="flex flex-col gap-1">
          <Label htmlFor="work-order-crew">Crew</Label>
          <Controller
            name="assigneeId"
            control={control}
            render={({ field }) => (
              <Select
                items={crewItems}
                value={field.value ? field.value : null}
                disabled={crewLocked}
                onValueChange={(value) => {
                  if (crewLocked || value === null) {
                    return
                  }
                  field.onChange(value)
                }}
              >
                <SelectTrigger id="work-order-crew" className="w-full" disabled={crewLocked}>
                  <SelectValue placeholder="Select a crew member" />
                </SelectTrigger>
                <SelectContent>
                  {crew.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.assigneeId ? (
            <p className="text-sm text-destructive">{errors.assigneeId.message}</p>
          ) : null}
        </div>
      ) : null}
      {showStatus && order ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Status</span>
          <div>
            <Badge variant={order.status}>{WORK_ORDER_STATUS_LABELS[order.status]}</Badge>
          </div>
        </div>
      ) : null}
      {showSolution && order ? (
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="work-order-solution">Latest solution</Label>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Solution history"
                onClick={() => setHistoryOpen(true)}
              >
                <HistoryIcon />
              </Button>
            </div>
            <Textarea id="work-order-solution" value={solution || "No solution yet."} disabled />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-medium">Solution history</span>
            <SolutionHistory solutions={order.solutions} />
          </div>
        </div>
      ) : null}
      {errors.root?.message ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      ) : null}
      {reviewError ? (
        <p role="alert" className="text-sm text-destructive">
          {reviewError}
        </p>
      ) : null}
    </>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          close()
        }
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{order ? "View work order" : "Add work order"}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {editable ? (
          <form
            id="work-order-form"
            onSubmit={handleSubmit(onValid, onInvalid)}
            className="flex min-w-0 flex-col gap-3"
          >
            {fields}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit">{submitLabel}</Button>
              {canReview && onReject ? (
                <Button type="button" variant="destructive" onClick={onReject}>
                  Reject
                </Button>
              ) : null}
              {canReview && onAttest ? (
                <Button type="button" variant="success" onClick={onAttest}>
                  Attest
                </Button>
              ) : null}
            </DialogFooter>
          </form>
        ) : (
          <div className="flex min-w-0 flex-col gap-3">
            {fields}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Close
              </Button>
              {canReview && onReject ? (
                <Button type="button" variant="destructive" onClick={onReject}>
                  Reject
                </Button>
              ) : null}
              {canReview && onAttest ? (
                <Button type="button" variant="success" onClick={onAttest}>
                  Attest
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        )}
        <SolutionHistoryDialog
          code={order?.code ?? ""}
          title={order?.title ?? ""}
          solutions={order?.solutions ?? []}
          open={historyOpen && order !== null}
          onOpenChange={(next) => {
            if (!next) {
              setHistoryOpen(false)
            }
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

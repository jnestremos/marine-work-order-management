import { DataTable } from "@/components/admin/DataTable"
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
import { SOLUTION_STATUS_LABELS, type WorkOrderSolution } from "@/lib/work-orders/types"

function formatPostedAt(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function SolutionHistory({ solutions }: { solutions: WorkOrderSolution[] }) {
  const rows = [...solutions].reverse()

  return (
    <div className="h-48 max-h-48 min-h-0 w-full max-w-full overflow-y-auto rounded-lg border">
      <DataTable
        minWidth="w-full min-w-0"
        containerClassName="min-w-0 max-w-full overflow-x-auto"
        empty="No solutions yet."
        rows={rows}
        getRowKey={(solution) => solution.id}
        columns={[
          {
            header: "Solution",
            wrap: true,
            value: (solution) => solution.text,
            cell: (solution) => solution.text,
          },
          {
            header: "Rejection reason",
            wrap: true,
            value: (solution) => solution.reviewNote ?? "",
            cell: (solution) => solution.reviewNote ?? "—",
          },
          {
            header: "Date posted",
            width: "w-44",
            value: (solution) => solution.postedAt,
            cell: (solution) => formatPostedAt(solution.postedAt),
          },
          {
            header: "Status",
            width: "w-32",
            value: (solution) => SOLUTION_STATUS_LABELS[solution.status],
            cell: (solution) => (
              <Badge variant={solution.status}>{SOLUTION_STATUS_LABELS[solution.status]}</Badge>
            ),
          },
        ]}
      />
    </div>
  )
}

export function SolutionHistoryDialog({
  code,
  title,
  solutions,
  open,
  onOpenChange,
}: {
  code: string
  title: string
  solutions: WorkOrderSolution[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onOpenChange(false)
        }
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] min-h-0 min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solution history</DialogTitle>
          <DialogDescription>
            {code ? `${code} · ${title}` : "Solutions sent for this work order."}
          </DialogDescription>
        </DialogHeader>
        <SolutionHistory solutions={solutions} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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
import {
  SOLUTION_STATUS_LABELS,
  type SolutionStatus,
  type WorkOrderSolution,
} from "@/lib/work-orders/types"

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

const statusClassName: Record<SolutionStatus, string | undefined> = {
  pending: undefined,
  accepted: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
}

function SolutionStatusBadge({ status }: { status: SolutionStatus }) {
  if (status === "pending") {
    return <Badge variant="warning">{SOLUTION_STATUS_LABELS[status]}</Badge>
  }
  return (
    <Badge variant="secondary" className={statusClassName[status]}>
      {SOLUTION_STATUS_LABELS[status]}
    </Badge>
  )
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
            header: "Date posted",
            width: "w-44",
            value: (solution) => solution.postedAt,
            cell: (solution) => formatPostedAt(solution.postedAt),
          },
          {
            header: "Status",
            width: "w-32",
            value: (solution) => SOLUTION_STATUS_LABELS[solution.status],
            cell: (solution) => <SolutionStatusBadge status={solution.status} />,
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

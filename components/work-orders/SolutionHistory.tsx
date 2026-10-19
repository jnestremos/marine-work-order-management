import { Badge } from "@/components/ui/badge"
import {
  SOLUTION_STATUS_LABELS,
  type SolutionStatus,
  type WorkOrderSolution,
} from "@/lib/work-orders/types"

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
  if (solutions.length === 0) {
    return <p className="text-sm text-muted-foreground">No solutions yet.</p>
  }

  return (
    <ol className="flex max-h-48 flex-col gap-2 overflow-y-auto">
      {[...solutions].reverse().map((solution, index) => (
        <li key={solution.id} className="rounded-lg border px-3 py-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Solution {solutions.length - index}</p>
            <SolutionStatusBadge status={solution.status} />
          </div>
          <p className="text-sm whitespace-pre-wrap">{solution.text}</p>
        </li>
      ))}
    </ol>
  )
}

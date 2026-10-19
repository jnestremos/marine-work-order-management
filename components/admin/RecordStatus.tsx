import { Badge } from "@/components/ui/badge"

export function RecordStatus({ active }: { active: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={
        active
          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
      }
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  )
}

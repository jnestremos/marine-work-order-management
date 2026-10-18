import { Badge } from "@/components/ui/badge"

export function RecordStatus({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "secondary" : "outline"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  )
}

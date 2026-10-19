"use client"

import { useId, useState, type ReactNode } from "react"
import { CheckboxGroup } from "@base-ui/react/checkbox-group"
import {
  BanIcon,
  CircleCheckIcon,
  ListFilterIcon,
  PencilIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "cn"

export type DataTableColumn<Row> = {
  header: string
  width?: string
  align?: "start" | "center"
  cellClassName?: string
  cell: (row: Row) => ReactNode
  value?: (row: Row) => string
}

const actionIcons: Record<string, LucideIcon> = {
  Edit: PencilIcon,
  Deactivate: BanIcon,
  Activate: CircleCheckIcon,
  Remove: Trash2Icon,
}

export type DataTableAction = {
  label: string
  onClick: () => void
  variant?: "outline" | "destructive" | "success"
}

export function DataTableActions({ actions }: { actions: DataTableAction[] }) {
  const single = actions.length === 1

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action, index) => {
        const Icon = actionIcons[action.label]
        return (
          <Button
            key={`${action.label}-${index}`}
            type="button"
            variant={action.variant ?? "outline"}
            size="sm"
            className={cn(
              "w-full",
              single && "col-span-2 mx-auto max-w-[calc(50%-0.25rem)]",
            )}
            onClick={action.onClick}
          >
            {Icon ? <Icon data-icon="inline-start" /> : null}
            {action.label}
          </Button>
        )
      })}
    </div>
  )
}

type SortState = {
  header: string
  direction: "asc" | "desc"
}

const CHOICE_HEADERS = new Set(["Role", "Status"])

const CHOICE_ORDER = [
  "Admin",
  "Captain",
  "Crew",
  "Active",
  "Inactive",
  "Open",
  "In Progress",
  "Done",
]

function columnText<Row>(column: DataTableColumn<Row>, row: Row) {
  return column.value?.(row) ?? ""
}

function isChoiceColumn<Row>(column: DataTableColumn<Row>) {
  return CHOICE_HEADERS.has(column.header)
}

function choiceOptions<Row>(column: DataTableColumn<Row>, rows: readonly Row[]) {
  const values = new Set<string>()
  for (const row of rows) {
    const value = columnText(column, row).trim()
    if (value.length > 0) {
      values.add(value)
    }
  }
  return [...values].sort((left, right) => {
    const leftIndex = CHOICE_ORDER.indexOf(left)
    const rightIndex = CHOICE_ORDER.indexOf(right)
    const leftRank = leftIndex === -1 ? CHOICE_ORDER.length : leftIndex
    const rightRank = rightIndex === -1 ? CHOICE_ORDER.length : rightIndex
    if (leftRank !== rightRank) {
      return leftRank - rightRank
    }
    return left.localeCompare(right)
  })
}

function ColumnMenu({
  header,
  filter,
  options,
  excluded,
  sort,
  onFilter,
  onExcluded,
  onSort,
}: {
  header: string
  filter: string
  options: string[]
  excluded: string[]
  sort: SortState | null
  onFilter: (value: string) => void
  onExcluded: (values: string[]) => void
  onSort: (direction: "asc" | "desc" | null) => void
}) {
  const filterId = useId()
  const choiceLabelId = useId()
  const sortName = useId()
  const sorted = sort?.header === header ? sort.direction : null
  const choices = options.length > 0
  const checked = options.filter((option) => !excluded.includes(option))
  const active = sorted !== null || (choices ? excluded.length > 0 : filter.trim().length > 0)

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Sort and filter ${header}`}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
          active && "bg-muted text-foreground",
        )}
      >
        <ListFilterIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56">
        <RadioGroup
          name={sortName}
          value={sorted ?? "none"}
          onValueChange={(value) => {
            if (value === "asc" || value === "desc") {
              onSort(value)
              return
            }
            onSort(null)
          }}
        >
          <label className="flex items-center gap-2">
            <RadioGroupItem value="none" />
            None
          </label>
          <label className="flex items-center gap-2">
            <RadioGroupItem value="asc" />
            Sort ascending
          </label>
          <label className="flex items-center gap-2">
            <RadioGroupItem value="desc" />
            Sort descending
          </label>
        </RadioGroup>
        <div className="flex flex-col gap-2 border-t pt-2">
          <Label id={choices ? choiceLabelId : undefined} htmlFor={choices ? undefined : filterId}>
            Filter {header}
          </Label>
          {choices ? (
            <CheckboxGroup
              aria-labelledby={choiceLabelId}
              className="grid gap-2"
              value={checked}
              onValueChange={(value) =>
                onExcluded(options.filter((option) => !value.includes(option)))
              }
            >
              {options.map((option) => (
                <label key={option} className="flex items-center gap-2 font-normal">
                  <Checkbox value={option} />
                  {option}
                </label>
              ))}
            </CheckboxGroup>
          ) : (
            <Input
              id={filterId}
              value={filter}
              placeholder="Contains"
              onChange={(event) => onFilter(event.target.value)}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  empty,
  minWidth,
  isSelected,
  containerClassName,
  stickyHeader,
}: {
  columns: DataTableColumn<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string
  empty: string
  minWidth: string
  isSelected?: (row: Row) => boolean
  containerClassName?: string
  stickyHeader?: boolean
}) {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [excludedChoices, setExcludedChoices] = useState<Record<string, string[]>>({})
  const [sort, setSort] = useState<SortState | null>(null)
  const filterable = columns.filter((column) => column.value)
  const visible = rows.filter((row) =>
    filterable.every((column) => {
      if (isChoiceColumn(column)) {
        const excluded = excludedChoices[column.header] ?? []
        return !excluded.includes(columnText(column, row))
      }
      const filter = (filters[column.header] ?? "").trim().toLowerCase()
      if (filter.length === 0) {
        return true
      }
      return columnText(column, row).toLowerCase().includes(filter)
    }),
  )
  if (sort) {
    const column = filterable.find((item) => item.header === sort.header)
    if (column) {
      const direction = sort.direction === "asc" ? 1 : -1
      visible.sort(
        (left, right) =>
          columnText(column, left).localeCompare(columnText(column, right), undefined, {
            sensitivity: "base",
          }) * direction,
      )
    }
  }

  return (
    <Table className={cn("table-fixed", minWidth)} containerClassName={containerClassName}>
      <TableHeader className={stickyHeader ? "sticky top-0 z-10 [&_th]:bg-popover" : undefined}>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.header}
              aria-sort={
                column.value
                  ? sort?.header === column.header
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                  : undefined
              }
              className={cn(
                "px-4",
                column.width,
                column.align === "center" && "text-center",
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1",
                  column.align === "center" && "justify-center",
                )}
              >
                <span>{column.header}</span>
                {column.value ? (
                  <ColumnMenu
                    header={column.header}
                    filter={filters[column.header] ?? ""}
                    options={isChoiceColumn(column) ? choiceOptions(column, rows) : []}
                    excluded={excludedChoices[column.header] ?? []}
                    sort={sort}
                    onFilter={(value) =>
                      setFilters((current) => ({ ...current, [column.header]: value }))
                    }
                    onExcluded={(values) =>
                      setExcludedChoices((current) => ({ ...current, [column.header]: values }))
                    }
                    onSort={(direction) =>
                      setSort(direction ? { header: column.header, direction } : null)
                    }
                  />
                ) : null}
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="px-4 text-muted-foreground">
              {rows.length === 0 ? empty : "No matching rows."}
            </TableCell>
          </TableRow>
        ) : (
          visible.map((row) => (
            <TableRow
              key={getRowKey(row)}
              data-state={isSelected?.(row) ? "selected" : undefined}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.header}
                  className={cn(
                    "px-4",
                    column.align === "center" ? "text-center" : "truncate",
                    column.cellClassName,
                  )}
                >
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

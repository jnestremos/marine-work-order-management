"use client"

import { useId, useState, type ReactNode } from "react"
import { ListFilterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export type DataTableAction = {
  label: string
  onClick: () => void
}

export function DataTableActions({ actions }: { actions: DataTableAction[] }) {
  const single = actions.length === 1

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action, index) => (
        <Button
          key={`${action.label}-${index}`}
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "w-full",
            single && "col-span-2 mx-auto max-w-[calc(50%-0.25rem)]",
          )}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}

type SortState = {
  header: string
  direction: "asc" | "desc"
}

function columnText<Row>(column: DataTableColumn<Row>, row: Row) {
  return column.value?.(row) ?? ""
}

function ColumnMenu({
  header,
  filter,
  sort,
  onFilter,
  onSort,
}: {
  header: string
  filter: string
  sort: SortState | null
  onFilter: (value: string) => void
  onSort: (direction: "asc" | "desc" | null) => void
}) {
  const filterId = useId()
  const sorted = sort?.header === header ? sort.direction : null
  const active = sorted !== null || filter.trim().length > 0

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
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant={sorted === "asc" ? "secondary" : "ghost"}
            size="sm"
            className="justify-start"
            onClick={() => onSort("asc")}
          >
            Sort ascending
          </Button>
          <Button
            type="button"
            variant={sorted === "desc" ? "secondary" : "ghost"}
            size="sm"
            className="justify-start"
            onClick={() => onSort("desc")}
          >
            Sort descending
          </Button>
          {sorted ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => onSort(null)}
            >
              Clear sort
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 border-t pt-2">
          <Label htmlFor={filterId}>Filter {header}</Label>
          <Input
            id={filterId}
            value={filter}
            placeholder="Contains"
            onChange={(event) => onFilter(event.target.value)}
          />
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
}: {
  columns: DataTableColumn<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string
  empty: string
  minWidth: string
  isSelected?: (row: Row) => boolean
}) {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<SortState | null>(null)
  const filterable = columns.filter((column) => column.value)
  const visible = rows.filter((row) =>
    filterable.every((column) => {
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
    <Table className={cn("table-fixed", minWidth)}>
      <TableHeader>
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
                    sort={sort}
                    onFilter={(value) =>
                      setFilters((current) => ({ ...current, [column.header]: value }))
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

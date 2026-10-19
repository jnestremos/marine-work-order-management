"use client"

import { useState } from "react"
import { DataTable } from "@/components/admin/DataTable"
import { QueryState } from "@/components/data/QueryState"
import {
  useMembersQuery,
  useServiceRecordsQuery,
  useVesselsQuery,
} from "@/components/data/marine-queries"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatRecordDate } from "@/lib/records/schema"
import { useSessionStore } from "@/lib/session/store"
import { ROLE_LABELS, type Vessel } from "@/lib/session/types"
import { EmptyRole } from "@/components/views/EmptyRole"

function vesselName(vessels: Vessel[], vesselId: string) {
  return vessels.find((vessel) => vessel.id === vesselId)?.name ?? ""
}

export function ServiceRecordSection() {
  const memberId = useSessionStore((state) => state.memberId)
  const members = useMembersQuery()
  const vessels = useVesselsQuery()
  const serviceRecords = useServiceRecordsQuery()
  const member = (members.data ?? []).find((item) => item.id === memberId) ?? null
  const vesselList = vessels.data ?? []
  const records = (serviceRecords.data ?? [])
    .filter((record) => record.memberId === member?.id)
    .sort((left, right) => right.startDate.localeCompare(left.startDate))
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const visible = normalizedQuery
    ? records.filter((record) => {
        const name = vesselName(vesselList, record.vesselId).toLowerCase()
        return (
          name.includes(normalizedQuery) ||
          ROLE_LABELS[record.role].toLowerCase().includes(normalizedQuery)
        )
      })
    : records

  return (
    <QueryState
      isLoading={members.isLoading || vessels.isLoading || serviceRecords.isLoading}
      error={members.error ?? vessels.error ?? serviceRecords.error}
    >
      {!member ? (
        <EmptyRole />
      ) : (
        <section className="min-w-0 max-w-full rounded-xl border bg-card max-md:overflow-x-auto">
          <div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-base font-semibold">Service record</h1>
              <p className="text-sm text-muted-foreground">
                {records.length} {records.length === 1 ? "record" : "records"}. Appointments follow
                vessel assignments.
              </p>
            </div>
            <div className="w-full md:w-64">
              <Label htmlFor="service-record-search" className="sr-only">
                Search
              </Label>
              <Input
                id="service-record-search"
                value={query}
                placeholder="Search vessel or role"
                className="w-full"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <DataTable
            minWidth="min-w-[40rem]"
            empty={normalizedQuery ? "No matching records." : "No service records yet."}
            rows={visible}
            getRowKey={(record) => record.id}
            columns={[
              {
                header: "Vessel",
                cellClassName: "font-medium",
                value: (record) => vesselName(vesselList, record.vesselId),
                cell: (record) => vesselName(vesselList, record.vesselId),
              },
              {
                header: "Role",
                width: "w-36",
                value: (record) => ROLE_LABELS[record.role],
                cell: (record) => ROLE_LABELS[record.role],
              },
              {
                header: "From",
                width: "w-36",
                value: (record) => record.startDate,
                cell: (record) => formatRecordDate(record.startDate),
              },
              {
                header: "To",
                width: "w-36",
                value: (record) => record.endDate || "Present",
                cell: (record) => formatRecordDate(record.endDate),
              },
            ]}
          />
        </section>
      )}
    </QueryState>
  )
}

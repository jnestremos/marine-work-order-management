"use client"

import { useState } from "react"
import { DataTable } from "@/components/admin/DataTable"
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
  const directory = useSessionStore((state) => state.directory)
  const memberId = useSessionStore((state) => state.memberId)
  const member = directory.members.find((item) => item.id === memberId) ?? null
  const records = directory.serviceRecords
    .filter((record) => record.memberId === member?.id)
    .sort((left, right) => right.startDate.localeCompare(left.startDate))
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const visible = normalizedQuery
    ? records.filter((record) => {
        const name = vesselName(directory.vessels, record.vesselId).toLowerCase()
        return (
          name.includes(normalizedQuery) ||
          ROLE_LABELS[record.role].toLowerCase().includes(normalizedQuery)
        )
      })
    : records

  if (!member) {
    return <EmptyRole />
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
        <div>
          <h1 className="text-base font-semibold">Service record</h1>
          <p className="text-sm text-muted-foreground">
            {records.length} {records.length === 1 ? "record" : "records"}
          </p>
        </div>
        <div>
          <Label htmlFor="service-record-search" className="sr-only">
            Search
          </Label>
          <Input
            id="service-record-search"
            value={query}
            placeholder="Search vessel or role"
            className="w-64"
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
            value: (record) => vesselName(directory.vessels, record.vesselId),
            cell: (record) => vesselName(directory.vessels, record.vesselId),
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
  )
}

export function SeaServiceSection() {
  const directory = useSessionStore((state) => state.directory)
  const memberId = useSessionStore((state) => state.memberId)
  const member = directory.members.find((item) => item.id === memberId) ?? null
  const records = directory.seaServices
    .filter((record) => record.memberId === member?.id)
    .sort((left, right) => right.signOnDate.localeCompare(left.signOnDate))
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const visible = normalizedQuery
    ? records.filter((record) => {
        const name = vesselName(directory.vessels, record.vesselId).toLowerCase()
        return (
          name.includes(normalizedQuery) ||
          ROLE_LABELS[record.role].toLowerCase().includes(normalizedQuery) ||
          record.signOnPort.toLowerCase().includes(normalizedQuery) ||
          record.signOffPort.toLowerCase().includes(normalizedQuery)
        )
      })
    : records

  if (!member) {
    return <EmptyRole />
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
        <div>
          <h1 className="text-base font-semibold">Sea service history</h1>
          <p className="text-sm text-muted-foreground">
            {records.length} {records.length === 1 ? "voyage" : "voyages"}
          </p>
        </div>
        <div>
          <Label htmlFor="sea-service-search" className="sr-only">
            Search
          </Label>
          <Input
            id="sea-service-search"
            value={query}
            placeholder="Search vessel, role, or port"
            className="w-64"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <DataTable
        minWidth="min-w-[52rem]"
        empty={normalizedQuery ? "No matching voyages." : "No sea service history yet."}
        rows={visible}
        getRowKey={(record) => record.id}
        columns={[
          {
            header: "Vessel",
            cellClassName: "font-medium",
            value: (record) => vesselName(directory.vessels, record.vesselId),
            cell: (record) => vesselName(directory.vessels, record.vesselId),
          },
          {
            header: "Role",
            width: "w-36",
            value: (record) => ROLE_LABELS[record.role],
            cell: (record) => ROLE_LABELS[record.role],
          },
          {
            header: "Sign on",
            width: "w-36",
            value: (record) => record.signOnDate,
            cell: (record) => formatRecordDate(record.signOnDate),
          },
          {
            header: "Sign-on port",
            value: (record) => record.signOnPort,
            cell: (record) => record.signOnPort,
          },
          {
            header: "Sign off",
            width: "w-36",
            value: (record) => record.signOffDate,
            cell: (record) => formatRecordDate(record.signOffDate),
          },
          {
            header: "Sign-off port",
            value: (record) => record.signOffPort,
            cell: (record) => record.signOffPort,
          },
        ]}
      />
    </section>
  )
}

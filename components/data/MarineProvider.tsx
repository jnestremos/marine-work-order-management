"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import * as api from "@/lib/supabase/api"
import { useSessionStore } from "@/lib/session/store"
import type { Assignment, Member, SeaService, ServiceRecord, Vessel } from "@/lib/session/types"
import type { Role } from "@/lib/session/types"
import type { WorkOrder } from "@/lib/work-orders/types"

type MarineState = {
  ready: boolean
  error: string | null
  members: Member[]
  vessels: Vessel[]
  assignments: Assignment[]
  serviceRecords: ServiceRecord[]
  seaServices: SeaService[]
  orders: WorkOrder[]
  reload: () => Promise<void>
  saveUser: (input: {
    id?: string
    firstName: string
    lastName: string
    role: Role
    serviceRecords: ServiceRecord[]
  }) => Promise<string | null>
  setMemberActive: (memberId: string, active: boolean) => Promise<string | null>
  saveVessel: (input: { id?: string; name: string }) => Promise<string | null>
  setVesselActive: (vesselId: string, active: boolean) => Promise<string | null>
  addAssignment: (input: { memberId: string; vesselId: string }) => Promise<string | null>
  removeAssignment: (memberId: string, vesselId: string) => Promise<string | null>
  saveSeaService: (input: {
    id?: string
    memberId: string
    vesselId: string
    role: Role
    signOnDate: string
    signOnPort: string
    signOffDate: string
    signOffPort: string
    createdById: string
  }) => Promise<string | null>
  setSeaServiceStatus: (id: string, status: SeaService["status"]) => Promise<string | null>
  removeSeaService: (id: string) => Promise<string | null>
  addWorkOrder: (input: {
    vesselId: string
    title: string
    issue: string
    assigneeId: string
    createdById: string
  }) => Promise<string | null>
  updateWorkOrder: (
    id: string,
    input: { title: string; issue: string; assigneeId: string },
  ) => Promise<string | null>
  reviewWorkOrder: (id: string, status: "accepted" | "rejected") => Promise<string | null>
  submitSolution: (orderId: string, memberId: string, text: string) => Promise<string | null>
}

const MarineContext = createContext<MarineState | null>(null)

export function MarineProvider({ children }: { children: ReactNode }) {
  const vesselId = useSessionStore((state) => state.vesselId)
  const role = useSessionStore((state) => state.role)
  const memberId = useSessionStore((state) => state.memberId)
  const setDirectory = useSessionStore((state) => state.setDirectory)
  const [data, setData] = useState<Awaited<ReturnType<typeof api.loadMarineData>> | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const [choices, next] = await Promise.all([api.loadSessionChoices(), api.loadMarineData()])
    setDirectory({
      ...choices,
      serviceRecords: [],
      seaServices: [],
    })
    setData(next)
  }

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const [choices, next] = await Promise.all([api.loadSessionChoices(), api.loadMarineData()])
        if (!active) {
          return
        }
        setDirectory({
          ...choices,
          serviceRecords: [],
          seaServices: [],
        })
        setData(next)
        setError(null)
      } catch (caught: unknown) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Could not load data")
        }
      }
    })()
    return () => {
      active = false
    }
  }, [vesselId, role, memberId, setDirectory])

  async function run(action: () => Promise<string | null>) {
    const message = await action()
    if (!message) {
      await reload()
    }
    return message
  }

  const value: MarineState = {
    ready: data !== null,
    error,
    members: data?.members ?? [],
    vessels: data?.vessels ?? [],
    assignments: data?.assignments ?? [],
    serviceRecords: data?.serviceRecords ?? [],
    seaServices: data?.seaServices ?? [],
    orders: data?.orders ?? [],
    reload,
    saveUser: (input) => run(() => api.saveUser(input)),
    setMemberActive: (memberId, active) => run(() => api.setMemberActive(memberId, active)),
    saveVessel: (input) => run(() => api.saveVessel(input)),
    setVesselActive: (vesselId, active) => run(() => api.setVesselActive(vesselId, active)),
    addAssignment: (input) => run(() => api.addAssignment(input)),
    removeAssignment: (memberId, vesselId) => run(() => api.removeAssignment(memberId, vesselId)),
    saveSeaService: (input) => run(() => api.saveSeaService(input)),
    setSeaServiceStatus: (id, status) => run(() => api.setSeaServiceStatus(id, status)),
    removeSeaService: (id) => run(() => api.removeSeaService(id)),
    addWorkOrder: (input) => run(() => api.addWorkOrder(input)),
    updateWorkOrder: (id, input) => run(() => api.updateWorkOrder(id, input)),
    reviewWorkOrder: (id, status) => run(() => api.reviewWorkOrder(id, status)),
    submitSolution: (orderId, memberId, text) => run(() => api.submitSolution(orderId, memberId, text)),
  }

  return (
    <MarineContext.Provider value={value}>
      {!data && !error ? (
        <div className="px-4 py-8">
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        </div>
      ) : null}
      <div hidden={!data && !error} aria-hidden={!data && !error}>
        {children}
      </div>
    </MarineContext.Provider>
  )
}

export function useMarine() {
  const value = useContext(MarineContext)
  if (!value) {
    throw new Error("useMarine must be used within MarineProvider")
  }
  return value
}

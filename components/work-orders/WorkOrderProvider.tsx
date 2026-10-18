"use client"

import { createContext, useContext, useRef, useState, type ReactNode } from "react"
import { marineFixture } from "@/lib/fixtures/marine"
import { buildWorkOrder, type WorkOrderDraft } from "@/lib/work-orders/rules"
import type { WorkOrder } from "@/lib/work-orders/types"

type WorkOrderStore = {
  orders: WorkOrder[]
  addWorkOrder: (input: WorkOrderDraft) => string | null
}

const WorkOrderContext = createContext<WorkOrderStore | null>(null)

export function WorkOrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const ordersRef = useRef<WorkOrder[]>([])

  function addWorkOrder(input: WorkOrderDraft) {
    const current = ordersRef.current
    const result = buildWorkOrder(marineFixture, current, {
      ...input,
      id: crypto.randomUUID(),
    })
    if (!result.ok) {
      return result.error
    }
    const next = [...current, result.order]
    ordersRef.current = next
    setOrders(next)
    return null
  }

  return <WorkOrderContext value={{ orders, addWorkOrder }}>{children}</WorkOrderContext>
}

export function useWorkOrders() {
  const store = useContext(WorkOrderContext)
  if (!store) {
    throw new Error("useWorkOrders must be used within WorkOrderProvider")
  }
  return store
}

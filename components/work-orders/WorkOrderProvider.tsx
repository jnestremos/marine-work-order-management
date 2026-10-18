"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
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

  function addWorkOrder(input: WorkOrderDraft) {
    let error: string | null = null
    setOrders((current) => {
      const result = buildWorkOrder(marineFixture, current, {
        ...input,
        id: crypto.randomUUID(),
      })
      if (!result.ok) {
        error = result.error
        return current
      }
      return [...current, result.order]
    })
    return error
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

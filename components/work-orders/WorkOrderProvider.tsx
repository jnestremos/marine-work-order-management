"use client"

import { createContext, useContext, useRef, useState, type ReactNode } from "react"
import { marineFixture, workOrderFixture } from "@/lib/fixtures/marine"
import { buildWorkOrder, workOrderCreateError, type WorkOrderDraft } from "@/lib/work-orders/rules"
import { reviewLatestSolution, submitSolution } from "@/lib/work-orders/solutions"
import type { WorkOrder } from "@/lib/work-orders/types"

type WorkOrderStore = {
  orders: WorkOrder[]
  addWorkOrder: (input: WorkOrderDraft) => string | null
  updateWorkOrder: (
    id: string,
    input: { title: string; issue: string; assigneeId: string },
  ) => string | null
  reviewWorkOrder: (id: string, status: "accepted" | "rejected") => void
  submitSolution: (orderId: string, memberId: string, text: string) => string | null
}

const WorkOrderContext = createContext<WorkOrderStore | null>(null)

function copyWorkOrders(): WorkOrder[] {
  return workOrderFixture.map((order) => ({
    ...order,
    solutions: order.solutions.map((solution) => ({ ...solution })),
  }))
}

export function WorkOrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState(copyWorkOrders)
  const ordersRef = useRef(orders)

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

  function updateWorkOrder(
    id: string,
    input: { title: string; issue: string; assigneeId: string },
  ) {
    const current = ordersRef.current
    const order = current.find((item) => item.id === id)
    if (!order) {
      return "Work order was not found"
    }
    const error = workOrderCreateError(marineFixture, {
      vesselId: order.vesselId,
      title: input.title,
      issue: input.issue,
      assigneeId: input.assigneeId,
      createdById: order.createdById,
    })
    if (error) {
      return error
    }
    const next = current.map((item) =>
      item.id === id
        ? {
            ...item,
            title: input.title.trim(),
            issue: input.issue.trim(),
            assigneeId: input.assigneeId,
          }
        : item,
    )
    ordersRef.current = next
    setOrders(next)
    return null
  }

  function reviewWorkOrder(id: string, status: "accepted" | "rejected") {
    const next = ordersRef.current.map((item) => {
      if (item.id !== id) {
        return item
      }
      return reviewLatestSolution(item, status) ?? item
    })
    ordersRef.current = next
    setOrders(next)
  }

  function sendSolution(orderId: string, memberId: string, text: string) {
    const order = ordersRef.current.find((item) => item.id === orderId)
    if (!order || order.assigneeId !== memberId) {
      return "You can only send a solution for a work order assigned to you"
    }
    const result = submitSolution(order, text, crypto.randomUUID())
    if (typeof result === "string") {
      return result
    }
    const next = ordersRef.current.map((item) => (item.id === orderId ? result : item))
    ordersRef.current = next
    setOrders(next)
    return null
  }

  return (
    <WorkOrderContext value={{ orders, addWorkOrder, updateWorkOrder, reviewWorkOrder, submitSolution: sendSolution }}>
      {children}
    </WorkOrderContext>
  )
}

export function useWorkOrders() {
  const store = useContext(WorkOrderContext)
  if (!store) {
    throw new Error("useWorkOrders must be used within WorkOrderProvider")
  }
  return store
}

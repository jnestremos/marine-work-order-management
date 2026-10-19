"use client"

import { useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/supabase/api"
import { marineKeys } from "@/lib/marine/query-keys"
import { useMarineSessionKey } from "@/components/data/marine-queries"
import type { Role, SeaService, ServiceRecord } from "@/lib/session/types"

export function useMarineMutations() {
  const queryClient = useQueryClient()
  const session = useMarineSessionKey()

  async function run(
    action: () => Promise<string | null>,
    keys: readonly (readonly unknown[])[],
  ) {
    const message = await action()
    if (!message) {
      await Promise.all(
        keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      )
    }
    return message
  }

  return {
    saveUser: (input: {
      id?: string
      firstName: string
      lastName: string
      role: Role
      serviceRecords: ServiceRecord[]
    }) =>
      run(() => api.saveUser(input), [
        marineKeys.members(session),
        marineKeys.serviceRecords(session),
        marineKeys.sessionChoices(session),
      ]),
    setMemberActive: (memberId: string, active: boolean) =>
      run(() => api.setMemberActive(memberId, active), [
        marineKeys.members(session),
        marineKeys.sessionChoices(session),
      ]),
    saveVessel: (input: { id?: string; name: string }) =>
      run(() => api.saveVessel(input), [
        marineKeys.vessels(session),
        marineKeys.sessionChoices(session),
      ]),
    setVesselActive: (vesselId: string, active: boolean) =>
      run(() => api.setVesselActive(vesselId, active), [
        marineKeys.vessels(session),
        marineKeys.sessionChoices(session),
      ]),
    addAssignment: (input: { memberId: string; vesselId: string }) =>
      run(() => api.addAssignment(input), [
        marineKeys.assignments(session),
        marineKeys.sessionChoices(session),
      ]),
    removeAssignment: (memberId: string, vesselId: string) =>
      run(() => api.removeAssignment(memberId, vesselId), [
        marineKeys.assignments(session),
        marineKeys.sessionChoices(session),
      ]),
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
    }) => run(() => api.saveSeaService(input), [marineKeys.seaServices(session)]),
    setSeaServiceStatus: (id: string, status: SeaService["status"]) =>
      run(() => api.setSeaServiceStatus(id, status), [marineKeys.seaServices(session)]),
    removeSeaService: (id: string) =>
      run(() => api.removeSeaService(id), [marineKeys.seaServices(session)]),
    addWorkOrder: (input: {
      vesselId: string
      title: string
      issue: string
      assigneeId: string
      createdById: string
    }) => run(() => api.addWorkOrder(input), [marineKeys.workOrders(session)]),
    updateWorkOrder: (
      id: string,
      input: { title: string; issue: string; assigneeId: string },
    ) => run(() => api.updateWorkOrder(id, input), [marineKeys.workOrders(session)]),
    reviewWorkOrder: (id: string, status: "accepted" | "rejected", note?: string) =>
      run(() => api.reviewWorkOrder(id, status, note), [marineKeys.workOrders(session)]),
    submitSolution: (orderId: string, memberId: string, text: string) =>
      run(() => api.submitSolution(orderId, memberId, text), [
        marineKeys.workOrders(session),
      ]),
  }
}

"use client"

import { useQuery } from "@tanstack/react-query"
import {
  loadAssignments,
  loadMembers,
  loadSeaServices,
  loadServiceRecords,
  loadSessionChoices,
  loadVessels,
  loadWorkOrders,
} from "@/lib/supabase/api"
import { marineKeys, type MarineSessionKey } from "@/lib/marine/query-keys"
import { useSessionStore } from "@/lib/session/store"

export function useMarineSessionKey(): MarineSessionKey {
  const vesselId = useSessionStore((state) => state.vesselId)
  const role = useSessionStore((state) => state.role)
  const memberId = useSessionStore((state) => state.memberId)
  return { vesselId, role, memberId }
}

export function useSessionChoicesQuery() {
  const session = useMarineSessionKey()
  return useQuery({
    queryKey: marineKeys.sessionChoices(session),
    queryFn: loadSessionChoices,
  })
}

export function useMembersQuery() {
  const session = useMarineSessionKey()
  return useQuery({
    queryKey: marineKeys.members(session),
    queryFn: loadMembers,
  })
}

export function useVesselsQuery() {
  const session = useMarineSessionKey()
  return useQuery({
    queryKey: marineKeys.vessels(session),
    queryFn: loadVessels,
  })
}

export function useAssignmentsQuery() {
  const session = useMarineSessionKey()
  return useQuery({
    queryKey: marineKeys.assignments(session),
    queryFn: loadAssignments,
  })
}

export function useServiceRecordsQuery() {
  const session = useMarineSessionKey()
  return useQuery({
    queryKey: marineKeys.serviceRecords(session),
    queryFn: loadServiceRecords,
  })
}

export function useSeaServicesQuery() {
  const session = useMarineSessionKey()
  return useQuery({
    queryKey: marineKeys.seaServices(session),
    queryFn: loadSeaServices,
  })
}

export function useWorkOrdersQuery() {
  const session = useMarineSessionKey()
  return useQuery({
    queryKey: marineKeys.workOrders(session),
    queryFn: loadWorkOrders,
  })
}

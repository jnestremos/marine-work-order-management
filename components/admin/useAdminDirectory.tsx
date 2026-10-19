"use client"

import { QueryState } from "@/components/data/QueryState"
import { useMarineMutations } from "@/components/data/marine-mutations"
import {
  useAssignmentsQuery,
  useMembersQuery,
  useServiceRecordsQuery,
  useVesselsQuery,
} from "@/components/data/marine-queries"
import type { ReactNode } from "react"

function combineError(...errors: Array<Error | null | undefined>) {
  return errors.find((error): error is Error => Boolean(error)) ?? null
}

export function useAdminUsersData() {
  const members = useMembersQuery()
  const vessels = useVesselsQuery()
  const serviceRecords = useServiceRecordsQuery()
  const mutations = useMarineMutations()
  return {
    isLoading: members.isLoading || vessels.isLoading || serviceRecords.isLoading,
    error: combineError(members.error, vessels.error, serviceRecords.error),
    members: members.data ?? [],
    vessels: vessels.data ?? [],
    serviceRecords: serviceRecords.data ?? [],
    saveUser: mutations.saveUser,
    setMemberActive: mutations.setMemberActive,
  }
}

export function useAdminVesselsData() {
  const vessels = useVesselsQuery()
  const members = useMembersQuery()
  const assignments = useAssignmentsQuery()
  const mutations = useMarineMutations()
  return {
    isLoading: vessels.isLoading || members.isLoading || assignments.isLoading,
    error: combineError(vessels.error, members.error, assignments.error),
    vessels: vessels.data ?? [],
    members: members.data ?? [],
    assignments: assignments.data ?? [],
    saveVessel: mutations.saveVessel,
    setVesselActive: mutations.setVesselActive,
    removeAssignment: mutations.removeAssignment,
  }
}

export function useAdminAssignmentsData() {
  const members = useMembersQuery()
  const vessels = useVesselsQuery()
  const assignments = useAssignmentsQuery()
  const mutations = useMarineMutations()
  return {
    isLoading: members.isLoading || vessels.isLoading || assignments.isLoading,
    error: combineError(members.error, vessels.error, assignments.error),
    members: members.data ?? [],
    vessels: vessels.data ?? [],
    assignments: assignments.data ?? [],
    addAssignment: mutations.addAssignment,
    removeAssignment: mutations.removeAssignment,
  }
}

export function AdminQueryGate({
  isLoading,
  error,
  children,
}: {
  isLoading: boolean
  error: Error | null
  children: ReactNode
}) {
  return (
    <QueryState isLoading={isLoading} error={error}>
      {children}
    </QueryState>
  )
}

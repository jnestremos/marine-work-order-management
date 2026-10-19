"use client"

import { useMarine } from "@/components/data/MarineProvider"

export function useAdminDirectory() {
  const marine = useMarine()
  return {
    directory: {
      members: marine.members,
      vessels: marine.vessels,
      assignments: marine.assignments,
      serviceRecords: marine.serviceRecords,
      seaServices: marine.seaServices,
    },
    orders: marine.orders,
    saveUser: marine.saveUser,
    setMemberActive: marine.setMemberActive,
    saveVessel: marine.saveVessel,
    setVesselActive: marine.setVesselActive,
    addAssignment: marine.addAssignment,
    removeAssignment: marine.removeAssignment,
  }
}

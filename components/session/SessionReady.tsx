"use client"

import { useEffect } from "react"
import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { sessionStore, useSessionStore } from "@/lib/session/store"

function SessionSkeleton() {
  return (
    <div>
      <div className="sticky top-0 w-full border-b px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Skeleton className="h-16 w-full sm:h-10 sm:w-40 sm:min-w-40" />
          <Skeleton className="h-16 w-full sm:h-10 sm:w-40 sm:min-w-40" />
          <Skeleton className="h-16 w-full sm:h-10 sm:w-40 sm:min-w-40" />
          <Skeleton className="h-4 w-48 sm:ml-auto" />
        </div>
      </div>
      <div className="px-4 py-8">
        <Skeleton className="h-8 w-40" />
      </div>
    </div>
  )
}

export function SessionReady({ children }: { children: ReactNode }) {
  const hasHydrated = useSessionStore((state) => state.hasHydrated)

  useEffect(() => {
    void sessionStore.persist.rehydrate()
  }, [])

  if (!hasHydrated) {
    return <SessionSkeleton />
  }

  return children
}

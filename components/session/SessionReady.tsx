"use client"

import { useEffect } from "react"
import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { catalogStore, useCatalogStore } from "@/lib/catalog/store"
import { sessionStore, useSessionStore } from "@/lib/session/store"

function ControlSkeleton() {
  return (
    <div className="flex w-full flex-col gap-1 sm:w-auto">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-8 w-full sm:w-40 sm:min-w-40" />
    </div>
  )
}

function SessionSkeleton() {
  return (
    <div>
      <div className="sticky top-0 z-40 w-full border-b bg-background px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <ControlSkeleton />
          <ControlSkeleton />
          <ControlSkeleton />
          <div className="sm:ml-auto sm:pb-2">
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
      </div>
      <div className="px-4 py-8">
        <Skeleton className="h-8 w-40" />
      </div>
    </div>
  )
}

export function SessionReady({ children }: { children: ReactNode }) {
  const catalogHydrated = useCatalogStore((state) => state.hasHydrated)
  const sessionHydrated = useSessionStore((state) => state.hasHydrated)

  useEffect(() => {
    void (async () => {
      await catalogStore.persist.rehydrate()
      await sessionStore.persist.rehydrate()
    })()
  }, [])

  if (!catalogHydrated || !sessionHydrated) {
    return <SessionSkeleton />
  }

  return children
}

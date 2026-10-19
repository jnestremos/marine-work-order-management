"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState, type ReactNode } from "react"
import { PageContentSkeleton } from "@/components/data/PageContentSkeleton"
import { useSessionChoicesQuery } from "@/components/data/marine-queries"
import { Skeleton } from "@/components/ui/skeleton"
import { useSessionStore } from "@/lib/session/store"

function SessionBarSkeleton() {
  return (
    <header className="z-40 w-full shrink-0 border-b bg-background px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex w-full flex-col gap-1 sm:w-auto">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-full sm:w-40 sm:min-w-40" />
          </div>
        ))}
        <div className="sm:ml-auto sm:pb-2">
          <Skeleton className="h-5 w-48" />
        </div>
      </div>
    </header>
  )
}

function SessionDirectorySync({ children }: { children: ReactNode }) {
  const setDirectory = useSessionStore((state) => state.setDirectory)
  const choices = useSessionChoicesQuery()

  useEffect(() => {
    if (!choices.data) {
      return
    }
    setDirectory({
      ...choices.data,
      serviceRecords: [],
      seaServices: [],
    })
  }, [choices.data, setDirectory])

  if (choices.isLoading && !choices.data) {
    return (
      <>
        <SessionBarSkeleton />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <PageContentSkeleton />
        </div>
      </>
    )
  }

  if (choices.error) {
    return (
      <div className="px-4 py-8 text-sm text-destructive">
        {choices.error.message}
      </div>
    )
  }

  return children
}

export function MarineProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={client}>
      <SessionDirectorySync>{children}</SessionDirectorySync>
    </QueryClientProvider>
  )
}

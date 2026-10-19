"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState, type ReactNode } from "react"
import { useSessionChoicesQuery } from "@/components/data/marine-queries"
import { useSessionStore } from "@/lib/session/store"

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
      <div className="px-4 py-8">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      </div>
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

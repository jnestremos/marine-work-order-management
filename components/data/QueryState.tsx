"use client"

import type { ReactNode } from "react"

export function QueryState({
  isLoading,
  error,
  children,
}: {
  isLoading: boolean
  error: Error | null
  children: ReactNode
}) {
  if (isLoading) {
    return (
      <div className="px-1 py-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      </div>
    )
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>
  }
  return children
}

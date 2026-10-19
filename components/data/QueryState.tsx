"use client"

import type { ReactNode } from "react"
import { PageContentSkeleton } from "@/components/data/PageContentSkeleton"

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
    return <PageContentSkeleton />
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>
  }
  return children
}

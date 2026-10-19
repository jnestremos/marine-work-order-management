import { Skeleton } from "@/components/ui/skeleton"

export function PageContentSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
        <div className="border-b px-4 py-3">
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="grid grid-cols-4 items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-7 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

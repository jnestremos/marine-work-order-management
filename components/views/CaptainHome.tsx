import { CaptainWorkspace } from "@/components/captain/CaptainWorkspace"

export function CaptainHome() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Captain</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create work orders for your vessels.
        </p>
      </div>
      <CaptainWorkspace />
    </section>
  )
}

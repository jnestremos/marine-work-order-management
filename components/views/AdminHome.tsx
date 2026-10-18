import { AdminPanels } from "@/components/admin/AdminPanels"

export function AdminHome() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage users, vessels, and assignments.
        </p>
      </div>
      <AdminPanels />
    </section>
  )
}

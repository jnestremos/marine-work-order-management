import { AdminPanels } from "@/components/admin/AdminPanels"

export function AdminHome() {
  return (
    <section className="px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <AdminPanels />
    </section>
  )
}

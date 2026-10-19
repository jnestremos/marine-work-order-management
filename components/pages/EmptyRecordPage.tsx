export function EmptyRecordPage({ title }: { title: string }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
      <p className="px-4 py-8 text-sm text-muted-foreground">No {title.toLowerCase()} yet.</p>
    </section>
  )
}

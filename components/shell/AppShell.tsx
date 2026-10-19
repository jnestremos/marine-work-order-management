"use client"

import { useEffect, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ROLE_HOME, ROLE_NAV } from "@/lib/navigation"
import { useSessionStore } from "@/lib/session/store"
import { cn } from "cn"

export function AppShell({ children }: { children: ReactNode }) {
  const role = useSessionStore((state) => state.role)
  const pathname = usePathname()
  const router = useRouter()
  const home = ROLE_HOME[role]
  const onRolePage = pathname === home || pathname.startsWith(`/${role}/`)

  useEffect(() => {
    if (!onRolePage) {
      router.replace(home)
    }
  }, [home, onRolePage, router])

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="shrink-0 border-b bg-sidebar text-sidebar-foreground md:w-60 md:border-r md:border-b-0">
        <nav aria-label="Sections" className="flex gap-1 overflow-x-auto p-3 md:flex-col">
          {ROLE_NAV[role].map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 p-4 md:p-6">{onRolePage ? children : null}</div>
    </div>
  )
}

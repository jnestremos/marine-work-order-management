"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { MenuIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ROLE_HOME, ROLE_NAV, type NavItem } from "@/lib/navigation"
import { useSessionStore } from "@/lib/session/store"
import { cn } from "cn"

function SectionLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[]
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Sections" className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
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
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const role = useSessionStore((state) => state.role)
  const pathname = usePathname()
  const router = useRouter()
  const home = ROLE_HOME[role]
  const items = ROLE_NAV[role]
  const current = items.find((item) => item.href === pathname)
  const onRolePage = pathname === home || pathname.startsWith(`/${role}/`)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!onRolePage) {
      router.replace(home)
    }
  }, [home, onRolePage, router])

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)")
    function closeOnDesktop() {
      if (desktop.matches) {
        setMenuOpen(false)
      }
    }
    desktop.addEventListener("change", closeOnDesktop)
    return () => desktop.removeEventListener("change", closeOnDesktop)
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="hidden shrink-0 overflow-y-auto border-r bg-sidebar text-sidebar-foreground md:block md:w-60">
        <SectionLinks items={items} pathname={pathname} />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b bg-sidebar px-4 py-2 text-sidebar-foreground md:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </Button>
          <p className="text-sm font-medium">{current?.label ?? "Menu"}</p>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          {onRolePage ? children : null}
        </div>
      </div>
      <Dialog
        open={menuOpen}
        onOpenChange={(next) => {
          setMenuOpen(next)
        }}
      >
        <DialogContent
          className="top-0 left-0 h-dvh w-72 max-w-[calc(100%-2rem)] translate-x-0 translate-y-0 content-start gap-0 rounded-none bg-sidebar p-0 text-sidebar-foreground sm:max-w-72"
        >
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>Menu</DialogTitle>
            <DialogDescription className="sr-only">Choose a section.</DialogDescription>
          </DialogHeader>
          <SectionLinks
            items={items}
            pathname={pathname}
            onNavigate={() => setMenuOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

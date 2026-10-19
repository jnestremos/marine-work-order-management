import {
  AnchorIcon,
  ClipboardListIcon,
  FileTextIcon,
  SettingsIcon,
  ShipIcon,
  UserPlusIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"
import type { Role } from "@/lib/session/types"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin/users",
  captain: "/captain/work-orders",
  crew: "/crew/work-orders",
}

export const ROLE_NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: "/admin/users", label: "Users", icon: UsersIcon },
    { href: "/admin/vessels", label: "Vessels", icon: ShipIcon },
    { href: "/admin/assignments", label: "Crew assignments", icon: UserPlusIcon },
    { href: "/admin/sea-service", label: "Sea service history", icon: AnchorIcon },
    { href: "/admin/profile", label: "Profile settings", icon: SettingsIcon },
  ],
  captain: [
    { href: "/captain/work-orders", label: "Work orders", icon: ClipboardListIcon },
    { href: "/captain/crew", label: "Crew assignments", icon: UsersIcon },
    { href: "/captain/service-record", label: "Service record", icon: FileTextIcon },
    { href: "/captain/sea-service", label: "Sea service history", icon: AnchorIcon },
    { href: "/captain/profile", label: "Profile settings", icon: SettingsIcon },
  ],
  crew: [
    { href: "/crew/work-orders", label: "Work orders", icon: ClipboardListIcon },
    { href: "/crew/service-record", label: "Service record", icon: FileTextIcon },
    { href: "/crew/sea-service", label: "Sea service history", icon: AnchorIcon },
    { href: "/crew/assignments", label: "Vessel assignments", icon: ShipIcon },
    { href: "/crew/profile", label: "Profile settings", icon: SettingsIcon },
  ],
}

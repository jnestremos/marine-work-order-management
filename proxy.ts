import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { redirectFor, roleFromSessionCookie } from "@/lib/session/redirect"
import { SESSION_STORAGE_KEY } from "@/lib/session/types"

export function proxy(request: NextRequest) {
  const role = roleFromSessionCookie(request.cookies.get(SESSION_STORAGE_KEY)?.value)
  const destination = redirectFor(request.nextUrl.pathname, role)
  if (!destination || destination === request.nextUrl.pathname) {
    return NextResponse.next()
  }
  return NextResponse.redirect(new URL(destination, request.url))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}

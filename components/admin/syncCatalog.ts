import { sessionStore } from "@/lib/session/store"

/** Run a catalog write, then realign the session if it became invalid. */
export function withSessionSync(action: () => void) {
  action()
  sessionStore.getState().syncFromCatalog()
}

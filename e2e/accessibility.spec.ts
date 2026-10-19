import { test } from "@playwright/test"
import { expectNoSeriousA11yViolations, setSession } from "./helpers/session"

const adminPages = [
  "/admin/users",
  "/admin/vessels",
  "/admin/assignments",
  "/admin/sea-service",
  "/admin/profile",
] as const

const captainPages = [
  "/captain/work-orders",
  "/captain/crew",
  "/captain/service-record",
  "/captain/sea-service",
  "/captain/profile",
] as const

const crewPages = [
  "/crew/work-orders",
  "/crew/service-record",
  "/crew/sea-service",
  "/crew/assignments",
  "/crew/profile",
] as const

test.describe("accessibility regression", () => {
  test("admin pages have no serious axe violations", async ({ page }) => {
    await setSession(page, {
      vessel: "MV Horizon",
      role: "Admin",
      member: "Avery Chen",
    })
    for (const path of adminPages) {
      await page.goto(path)
      await page.getByRole("navigation", { name: "Sections" }).waitFor()
      await expectNoSeriousA11yViolations(page)
    }
  })

  test("captain pages have no serious axe violations", async ({ page }) => {
    await setSession(page, {
      vessel: "MV Horizon",
      role: "Captain",
      member: "Blake Ortiz",
    })
    for (const path of captainPages) {
      await page.goto(path)
      await page.getByRole("navigation", { name: "Sections" }).waitFor()
      await expectNoSeriousA11yViolations(page)
    }
  })

  test("crew pages have no serious axe violations", async ({ page }) => {
    await setSession(page, {
      vessel: "MV Horizon",
      role: "Crew",
      member: "Casey Nguyen",
    })
    for (const path of crewPages) {
      await page.goto(path)
      await page.getByRole("navigation", { name: "Sections" }).waitFor()
      await expectNoSeriousA11yViolations(page)
    }
  })
})

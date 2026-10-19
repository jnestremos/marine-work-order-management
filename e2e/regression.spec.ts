import { expect, test } from "@playwright/test"
import { setSession } from "./helpers/session"

test.describe("role navigation regression", () => {
  test("admin can open directory sections", async ({ page }) => {
    await setSession(page, {
      vessel: "MV Horizon",
      role: "Admin",
      member: "Avery Chen",
    })

    await page.goto("/admin/users")
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible()
    await expect(page.locator("tbody").getByText("Avery", { exact: true })).toBeVisible()

    await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Vessels" }).click()
    await expect(page).toHaveURL(/\/admin\/vessels$/)
    await expect(page.locator("tbody").getByText("MV Horizon")).toBeVisible()

    const nav = page.getByRole("navigation", { name: "Sections" })
    await nav.getByRole("link", { name: "Crew assignments" }).click()
    await expect(page).toHaveURL(/\/admin\/assignments$/)

    await nav.getByRole("link", { name: "Sea service history" }).click()
    await expect(page).toHaveURL(/\/admin\/sea-service$/)

    await nav.getByRole("link", { name: "Profile settings" }).click()
    await expect(page).toHaveURL(/\/admin\/profile$/)
    await expect(page.getByRole("heading", { name: "Profile settings" })).toBeVisible()
  })

  test("captain can open operational sections", async ({ page }) => {
    await setSession(page, {
      vessel: "MV Horizon",
      role: "Captain",
      member: "Blake Ortiz",
    })

    await page.goto("/captain/work-orders")
    await expect(page.getByRole("heading", { name: "Work orders" })).toBeVisible()
    await expect(page.getByText("WO-1001")).toBeVisible()

    await page.getByRole("link", { name: "Crew assignments" }).click()
    await expect(page).toHaveURL(/\/captain\/crew$/)

    await page.getByRole("link", { name: "Service record" }).click()
    await expect(page).toHaveURL(/\/captain\/service-record$/)

    await page.getByRole("link", { name: "Sea service history" }).click()
    await expect(page).toHaveURL(/\/captain\/sea-service$/)
  })

  test("crew can open assigned work and profile", async ({ page }) => {
    await setSession(page, {
      vessel: "MV Horizon",
      role: "Crew",
      member: "Casey Nguyen",
    })

    await page.goto("/crew/work-orders")
    await expect(page.getByRole("heading", { name: "Work orders" })).toBeVisible()
    await expect(page.getByText("WO-1001")).toBeVisible()

    const nav = page.getByRole("navigation", { name: "Sections" })
    await nav.getByRole("link", { name: "Vessel assignments" }).click()
    await expect(page).toHaveURL(/\/crew\/assignments$/)
    await expect(page.locator("tbody").getByText("MV Horizon").first()).toBeVisible()

    await nav.getByRole("link", { name: "Profile settings" }).click()
    await expect(page.getByRole("heading", { name: "Profile settings" })).toBeVisible()
  })

  test("switching role redirects to that role home", async ({ page }) => {
    await setSession(page, {
      vessel: "MV Horizon",
      role: "Admin",
      member: "Avery Chen",
    })
    await expect(page).toHaveURL(/\/admin\//)

    await setSession(page, {
      vessel: "MV Horizon",
      role: "Captain",
      member: "Blake Ortiz",
    })
    await expect(page).toHaveURL(/\/captain\//)

    await setSession(page, {
      vessel: "MV Horizon",
      role: "Crew",
      member: "Casey Nguyen",
    })
    await expect(page).toHaveURL(/\/crew\//)
  })
})

test.describe("work order business process", () => {
  test("captain create → crew resolve → captain reject validation → attest", async ({ page }) => {
    const title = `E2E lifecycle ${Date.now()}`

    await setSession(page, {
      vessel: "MV Horizon",
      role: "Captain",
      member: "Blake Ortiz",
    })
    await page.goto("/captain/work-orders")
    await page.getByRole("button", { name: "Add work order" }).click()

    let dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByLabel("Title").fill(title)
    await dialog.getByLabel("Issue").fill("Automated regression lifecycle flow.")
    await dialog.locator("#work-order-crew").click()
    await page.getByRole("option", { name: "Casey Nguyen", exact: true }).click()
    await dialog.getByRole("button", { name: "Add work order" }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText(title)).toBeVisible()

    await setSession(page, {
      vessel: "MV Horizon",
      role: "Crew",
      member: "Casey Nguyen",
    })
    await page.goto("/crew/work-orders")
    const crewRow = page.locator("tr", { hasText: title })
    await expect(crewRow).toBeVisible()
    await crewRow.getByRole("button", { name: "Resolve" }).click()
    dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: /Send solution/i })).toBeVisible()
    await dialog.getByRole("textbox", { name: "Solution" }).fill(
      "Completed the lifecycle check during regression.",
    )
    await dialog.getByRole("button", { name: "Send solution" }).click()
    await expect(dialog).toBeHidden({ timeout: 20_000 })

    await setSession(page, {
      vessel: "MV Horizon",
      role: "Captain",
      member: "Blake Ortiz",
    })
    await page.goto("/captain/work-orders")
    const captainRow = page.locator("tr", { hasText: title })
    await expect(captainRow).toBeVisible()
    await captainRow.getByRole("button", { name: "Reject" }).click()
    dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "Reject work order" })).toBeVisible()
    await dialog.getByRole("button", { name: "Reject" }).click()
    await expect(dialog.getByRole("alert")).toContainText(/rejection reason/i)
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden()

    await captainRow.getByRole("button", { name: "Attest" }).click()
    await expect(captainRow.getByRole("button", { name: "Attest" })).toHaveCount(0, {
      timeout: 20_000,
    })
  })
})

test.describe("admin directory process", () => {
  test("admin can open user edit dialog", async ({ page }) => {
    await setSession(page, {
      vessel: "MV Horizon",
      role: "Admin",
      member: "Avery Chen",
    })
    await page.goto("/admin/users")

    await page.getByLabel("Search").fill("Casey")
    const row = page.locator("tbody tr").filter({ hasText: "Casey" }).filter({ hasText: "Nguyen" })
    await expect(row).toBeVisible()
    await row.getByRole("button", { name: "Edit" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel("First name")).toHaveValue("Casey")
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden()
  })

  test("admin vessels page lists active and inactive vessels", async ({ page }) => {
    await setSession(page, {
      vessel: "MV Horizon",
      role: "Admin",
      member: "Avery Chen",
    })
    await page.goto("/admin/vessels")
    await expect(page.getByText("MV Horizon")).toBeVisible()
    await expect(page.getByText("MV Aurora")).toBeVisible()
  })

  test("signing off a service record removes the vessel assignment", async ({ page }) => {
    await setSession(page, {
      vessel: "MV Horizon",
      role: "Admin",
      member: "Avery Chen",
    })
    await page.goto("/admin/users")
    await page.getByLabel("Search").fill("Ivan")
    const userRow = page
      .locator("tbody tr")
      .filter({ hasText: "Ivan" })
      .filter({ hasText: "Brooks" })
    await expect(userRow).toBeVisible()
    await userRow.getByRole("button", { name: "Edit" }).click()

    const userDialog = page.getByRole("dialog").filter({ hasText: "Edit user" })
    await expect(userDialog).toBeVisible()
    const serviceRow = userDialog
      .locator("tbody tr")
      .filter({ hasText: "MV Horizon" })
      .filter({ hasText: "Present" })
      .first()
    await expect(serviceRow).toBeVisible()
    await serviceRow.getByRole("button", { name: "Edit" }).click()

    const recordDialog = page.getByRole("dialog").filter({ hasText: "Edit service record" })
    await expect(recordDialog).toBeVisible()
    const startDate = await recordDialog.locator("#member-service-start").inputValue()
    expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    await expect(recordDialog.locator("#member-service-end")).toHaveAttribute("min", startDate)
    await recordDialog.locator("#member-service-end").fill(startDate)
    await recordDialog.getByRole("button", { name: "Save record" }).click()
    await expect(recordDialog).toBeHidden()

    await userDialog.getByRole("button", { name: "Save user" }).click()
    await expect(userDialog).toBeHidden({ timeout: 20_000 })

    await page.goto("/admin/assignments")
    await page.getByLabel("Search").fill("Ivan")
    await expect(page.locator("tbody tr").filter({ hasText: "Ivan Brooks" })).toHaveCount(0)

    await page.getByRole("button", { name: "Add assignment" }).click()
    const assignDialog = page.getByRole("dialog").filter({ hasText: "Add assignment" })
    await expect(assignDialog).toBeVisible()
    await assignDialog.locator("#assignment-user").click()
    await page.getByRole("option", { name: "Ivan Brooks", exact: true }).click()
    await assignDialog.locator("#assignment-vessel").click()
    await page.getByRole("option", { name: "MV Horizon", exact: true }).click()
    await assignDialog.getByRole("button", { name: "Add assignment" }).click()
    await expect(assignDialog).toBeHidden({ timeout: 20_000 })
    await expect(page.locator("tbody tr").filter({ hasText: "Ivan Brooks" })).toBeVisible()
  })

  test("mobile tables keep headers readable with horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setSession(page, {
      vessel: "MV Horizon",
      role: "Admin",
      member: "Avery Chen",
    })
    await page.goto("/admin/users")

    const container = page.locator('[data-slot="table-container"]').first()
    await expect(container).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /First name/i })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /Last name/i })).toBeVisible()

    const metrics = await container.evaluate((node) => ({
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    }))
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth)

    await container.evaluate((node) => {
      node.scrollLeft = node.scrollWidth
    })
    await expect(page.getByRole("columnheader", { name: /^Actions$/i })).toBeVisible()
  })

  test("sea service date inputs constrain calendar selection order", async ({ page }) => {
    await setSession(page, {
      vessel: "MV Horizon",
      role: "Admin",
      member: "Avery Chen",
    })
    await page.goto("/admin/sea-service")
    await page.getByRole("button", { name: "Add voyage" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    await dialog.locator("#sea-service-on-date").fill("2024-03-01")
    await expect(dialog.locator("#sea-service-off-date")).toHaveAttribute("min", "2024-03-01")
    await dialog.locator("#sea-service-off-date").fill("2024-09-12")
    await expect(dialog.locator("#sea-service-on-date")).toHaveAttribute("max", "2024-09-12")
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden()
  })
})

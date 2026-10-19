import { expect, type Page } from "@playwright/test"

async function chooseSelectOption(page: Page, triggerId: string, optionLabel: string) {
  const trigger = page.locator(`#${triggerId}`)
  await expect(trigger).toBeEnabled({ timeout: 30_000 })
  await trigger.click()
  const option = page.getByRole("option", { name: optionLabel, exact: true })
  await expect(option).toBeVisible()
  await option.click()
  await expect(trigger).toContainText(optionLabel)
}

export async function waitForSessionReady(page: Page) {
  await page.goto("/")
  await expect(page.locator("#vessel-select")).toBeVisible({ timeout: 30_000 })
}

export async function setSession(
  page: Page,
  input: { vessel: string; role: "Admin" | "Captain" | "Crew"; member: string },
) {
  await waitForSessionReady(page)
  await chooseSelectOption(page, "vessel-select", input.vessel)
  await chooseSelectOption(page, "role-select", input.role)
  await chooseSelectOption(page, "member-select", input.member)
}

export async function expectNoSeriousA11yViolations(page: Page) {
  const AxeBuilder = (await import("@axe-core/playwright")).default
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()
  const serious = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  )
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
}

import { test, expect, type Page } from "@playwright/test";
import axe from "axe-core";

const storageKey = "eventiq-browser-data-v1";
async function createEvent(page: Page) {
  await page.goto("/events/new");
  await page
    .getByRole("button", { name: "Wedding example", exact: true })
    .click();
  await page
    .getByLabel("Event name", { exact: true })
    .fill("Browser verification");
  await page.getByRole("button", { name: "Create event & plan" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Browser verification", exact: true }),
  ).toBeVisible();
}
async function budget(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).events[0].state.budget,
    storageKey,
  );
}
test.beforeEach(async ({ page }) => {
  // Unexpected browser exceptions fail the test, not just the console log.
  page.on("pageerror", (error) => {
    throw error;
  });
});
test("event, guest and payment records survive refresh", async ({ page }) => {
  await createEvent(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Browser verification", exact: true }),
  ).toBeVisible();
  await page.goto("/guests");
  await page.getByRole("button", { name: "Add guest", exact: true }).click();
  await page.getByLabel("Guest name", { exact: true }).fill("Demo guest");
  await page.getByRole("button", { name: "Save guest", exact: true }).click();
  await expect(page.getByText("Demo guest", { exact: true })).toBeVisible();
  await page.goto("/expenses");
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await page.getByLabel("Expense title", { exact: true }).fill("Venue deposit");
  await page.getByLabel(/Total amount/).fill("10000");
  await page
    .getByRole("combobox", { name: /Expense status/ })
    .selectOption("Confirmed");
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  await page.getByRole("button", { name: /Record payment/ }).click();
  await page.getByLabel(/Payment amount/).fill("4000");
  await page
    .getByRole("button", { name: "Save payment record", exact: true })
    .click();
  // Saving uses an asynchronous browser lock. Refresh only after the UI confirms it.
  await expect(
    page.getByText("1 recorded payment", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Venue deposit", { exact: true })).toBeVisible();
  await expect(
    page.getByText("1 recorded payment", { exact: true }),
  ).toBeVisible();
  const data = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    storageKey,
  );
  expect(data.events[0].guests).toHaveLength(1);
  expect(data.events[0].expenses[0].payments[0].amount).toBe(4000);
});
test("planner changes require approval and can be undone", async ({ page }) => {
  await createEvent(page);
  const original = await budget(page);
  await page.goto("/planner");
  await page
    .getByLabel("Message your event planner")
    .fill("Set my budget to 10 lakh.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const apply = page.getByRole("button", {
    name: "Apply changes",
    exact: true,
  });
  await expect(apply).toBeVisible();
  expect(await budget(page)).toBe(original);
  await apply.click();
  await expect.poll(() => budget(page)).toBe(1_000_000);
  await page.goto("/history");
  await page
    .getByRole("button", { name: "Undo this change", exact: true })
    .click();
  await expect.poll(() => budget(page)).toBe(original);
});
test("backup restores into an isolated profile and rejects duplicates", async ({
  page,
  browser,
}) => {
  await createEvent(page);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const path = await (await download).path();
  expect(path).toBeTruthy();
  const separate = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    const fresh = await separate.newPage();
    await fresh.goto("/dashboard");
    expect(
      await fresh.evaluate((key) => localStorage.getItem(key), storageKey),
    ).toBeNull();
    await fresh.getByLabel("Import EventIQ backup").setInputFiles(path!);
    await expect(
      fresh.getByRole("heading", { name: "Browser verification", exact: true }),
    ).toBeVisible();
    await fresh.getByLabel("Import EventIQ backup").setInputFiles(path!);
    await expect(fresh.getByRole("status")).toContainText("already exists");
  } finally {
    await separate.close();
  }
});
test("keyboard dialog isolates the page and restores focus", async ({
  page,
}) => {
  await createEvent(page);
  const open = page.getByRole("button", {
    name: "Edit event details",
    exact: true,
  });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Event details" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((node) => node.contains(document.activeElement)),
    ).toBe(true);
  }
  expect(
    await page
      .locator(".main-shell")
      .evaluate((node) => (node as HTMLElement).inert),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
});
for (const theme of ["light", "dark"] as const) {
  test(
    theme + " screens meet automated accessibility rules and fit the viewport",
    async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await createEvent(page);
      for (const route of [
        "/dashboard",
        "/planner",
        "/budget",
        "/events/new",
      ]) {
        await page.goto(route);
        await expect(page.locator("main")).toBeVisible();
        if (route !== "/events/new")
          await expect(page.getByLabel("Select event")).toHaveValue(/.+/);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        if (route === "/dashboard")
          await expect(
            page.getByRole("heading", {
              name: "Browser verification",
              exact: true,
            }),
          ).toBeVisible();
        if (route === "/planner")
          await expect(
            page.getByLabel("Message your event planner"),
          ).toBeVisible();
        if (route === "/budget")
          await expect(
            page.getByRole("table", {
              name: "Budget allocations and estimated costs by category",
            }),
          ).toBeVisible();
        await page.addScriptTag({ content: axe.source });
        const violations = await page.evaluate(async () => {
          const result = await (
            window as unknown as {
              axe: {
                run: (options: unknown) => Promise<{
                  violations: {
                    id: string;
                    impact: string;
                    nodes: { target: unknown; failureSummary?: string }[];
                  }[];
                }>;
              };
            }
          ).axe.run({
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          });
          return result.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              reason: n.failureSummary,
            })),
          }));
        });
        expect(violations, route).toEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          route,
        ).toBe(true);
      }
    },
  );
}

test("production endpoints retain security and privacy boundaries", async ({
  request,
}) => {
  const page = await request.get("/");
  expect(page.headers()["x-content-type-options"]).toBe("nosniff");
  expect(page.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  const health = await request.get("/api/health");
  expect(health.headers()["cache-control"]).toBe("private, no-store");
  expect(await health.json()).toMatchObject({
    storage: "browser",
    mode: "demo",
  });
  expect((await request.get("/api/events")).status()).toBe(404);
  expect((await request.get("/api/auth/providers")).status()).toBe(404);
  const denied = await request.post("/api/demo/extract", {
    headers: { Origin: "https://other.example" },
    data: { text: "Wedding for 100 guests" },
  });
  expect(denied.status()).toBe(403);
});

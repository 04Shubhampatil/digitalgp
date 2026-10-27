import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const PUBLIC_SLUG = process.env.E2E_PUBLIC_SLUG ?? "ganeshwadi";

test.describe("routing and guards (no data needed)", () => {
  test("root page renders the platform name and sign-in link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /साइन इन|sign in/i })).toBeVisible();
  });

  test("admin routes redirect anonymous users to login with next=", async ({ page }) => {
    await page.goto("/admin/users/new");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers%2Fnew/);
  });

  test("login page switches language via the toggle", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("पुन्हा स्वागत आहे");
    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
  });

  test("login rejects wrong credentials with an inline error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/ईमेल|email/i).fill("nobody@example.com");
    await page.getByLabel(/पासवर्ड|password/i).first().fill("definitely-wrong-123");
    await page.getByRole("button", { name: /साइन इन|sign in/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("unknown tenant slug shows the not-found page", async ({ page }) => {
    const res = await page.goto("/no-such-gram-panchayat-xyz");
    expect(res?.status()).toBe(404);
  });
});

test.describe("public website (needs a published seeded site)", () => {
  test("home renders header, nav and footer for the tenant", async ({ page }) => {
    const res = await page.goto(`/${PUBLIC_SLUG}`);
    test.skip(res?.status() !== 200, `/${PUBLIC_SLUG} is not published in this environment`);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible();
  });

  test("grievance page has register and track forms", async ({ page }) => {
    const res = await page.goto(`/${PUBLIC_SLUG}/grievance`);
    test.skip(res?.status() !== 200, "tenant not published");
    await expect(page.getByRole("button", { name: /submit|सादर/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /track|तपासा/i })).toBeVisible();
  });
});

test.describe("admin (needs seeded credentials)", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD");

  test("super admin signs in and sees the dashboard and role-gated navigation", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/ईमेल|email/i).fill(ADMIN_EMAIL!);
    await page.getByLabel(/पासवर्ड|password/i).first().fill(ADMIN_PASSWORD!);
    await page.getByRole("button", { name: /साइन इन|sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();
    await page.getByRole("link", { name: /websites|संकेतस्थळ/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/websites/);
    await expect(page.getByRole("table")).toBeVisible();
  });
});

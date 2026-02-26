import { expect, test, type Page } from "@playwright/test";

async function setupStudentApiMocks(page: Page) {
  await page.route("**/adminapi/v1.0/me", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: "unauthorized" }),
    });
  });

  await page.route("**/api/v1.0/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: "student-1",
          first_name: "Avidaa",
          last_name: "Name",
          role: "student",
        },
        message: "ok",
      }),
    });
  });

  await page.route("**/api/v1.0/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: "student-1",
          email: "avidaa@example.com",
          first_name: "Avidaa",
          last_name: "Name",
          data: { bio: "Student profile" },
          last_seen: null,
        },
        message: "ok",
      }),
    });
  });

  await page.route("**/api/v1.0/applications**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "ok", data: {} }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          {
            university_id: "u-1",
            university_name: "National University of Uzbekistan",
            application_cycle: "2026-Fall",
            status: "draft",
            created_at: "2026-01-10T10:00:00Z",
            submitted_at: null,
          },
          {
            university_id: "u-2",
            university_name: "Tashkent State University of Economics",
            application_cycle: "2026-Spring",
            status: "draft",
            created_at: "2026-01-12T10:00:00Z",
            submitted_at: null,
          },
          {
            university_id: "u-3",
            university_name: "National University of Uzbekistan",
            application_cycle: "2025-Spring",
            status: "submitted",
            created_at: "2025-11-10T10:00:00Z",
            submitted_at: "2025-12-10T10:00:00Z",
          },
        ],
        message: "ok",
      }),
    });
  });

  await page.route("**/api/v1.0/favorites", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "u-1", name: "National University of Uzbekistan" },
        { id: "u-2", name: "Tashkent State University of Economics" },
        { id: "u-3", name: "University of Amsterdam" },
      ]),
    });
  });

  await page.route("**/api/v1.0/signout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}

test.describe("Student Dashboard Visual Parity", () => {
  test("matches student dashboard shell and composition", async ({ page }) => {
    await setupStudentApiMocks(page);

    await page.goto("/student/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("student-dashboard-shell.png", { fullPage: true });
  });
});

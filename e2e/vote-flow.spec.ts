import { expect, test } from "@playwright/test";

test("host creates a room and a voter submits a vote", async ({ page }) => {
  await page.goto("/host");
  await page.getByRole("button", { name: /create room/i }).click();
  await page.waitForURL(/\/host\/[A-Z0-9]{6}$/);

  const code = page.url().split("/").pop() as string;

  await page.goto(`/room/${code}`);
  await page.getByPlaceholder("Alex Johnson").fill("Jamie");
  await page.getByPlaceholder("Candidate name").fill("Taylor");
  await page.getByRole("button", { name: /submit vote/i }).click();
  await expect(
    page.getByRole("heading", { name: /vote submitted/i })
  ).toBeVisible();

  await page.goto(`/host/${code}`);
  await expect(page.getByText("Total votes: 1")).toBeVisible();
});

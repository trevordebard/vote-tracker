import { expect, test } from "@playwright/test";

async function createRoom(page: import("@playwright/test").Page) {
  await page.goto("/host");

  // Add a role via the ChipInput
  const chipInput = page.locator("input[placeholder='e.g. Secretary']");
  await chipInput.fill("General");
  await chipInput.press("Enter");

  // Wait for the chip to appear and the button to become enabled
  await expect(page.getByText("General").first()).toBeVisible();
  const createButton = page.getByRole("button", { name: /create room/i });
  await expect(createButton).toBeEnabled();
  await createButton.click();
  await page.waitForURL(/\/host\/[A-Z0-9]{6}$/);

  return page.url().split("/").pop() as string;
}

test("host creates a room and a voter submits a vote", async ({ page }) => {
  const code = await createRoom(page);

  // Voter submits a vote
  await page.goto(`/room/${code}`);
  await page.getByPlaceholder("Alex Johnson").fill("Jamie");
  await page.getByPlaceholder("Candidate name").fill("Taylor");
  await page.getByRole("button", { name: /submit vote/i }).click();
  await expect(
    page.getByRole("heading", { name: /votes submitted/i })
  ).toBeVisible();

  // Verify vote appears on host dashboard
  await page.goto(`/host/${code}`);
  await expect(page.getByText("Total votes: 1")).toBeVisible();
});

test("voter can return to room and edit their vote", async ({ page }) => {
  const code = await createRoom(page);

  // Submit initial vote
  await page.goto(`/room/${code}`);
  await page.getByPlaceholder("Alex Johnson").fill("Jamie");
  await page.getByPlaceholder("Candidate name").fill("Taylor");
  await page.getByRole("button", { name: /submit vote/i }).click();
  await expect(
    page.getByRole("heading", { name: /votes submitted/i })
  ).toBeVisible();

  // Navigate away and return
  await page.goto("/");
  await expect(page.getByText("Recently voted rooms")).toBeVisible();
  await page.getByRole("button", { name: /return to room/i }).first().click();
  await page.waitForURL(/\/room\/[A-Z0-9]{6}$/);

  // Should see submitted state with edit button
  await expect(
    page.getByRole("heading", { name: /votes submitted/i })
  ).toBeVisible();
  await expect(page.getByText("Taylor")).toBeVisible();

  // Click edit and change the vote
  await page.getByRole("button", { name: /edit vote/i }).click();
  await page.getByPlaceholder("Candidate name").fill("Morgan");
  await page.getByRole("button", { name: /update vote/i }).click();
  await expect(
    page.getByRole("heading", { name: /votes submitted/i })
  ).toBeVisible();
  await expect(page.getByText("Morgan")).toBeVisible();

  // Verify host dashboard still shows 1 vote (not 2)
  await page.goto(`/host/${code}`);
  await expect(page.getByText("Total votes: 1")).toBeVisible();
});

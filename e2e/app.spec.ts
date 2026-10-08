import { expect, test, type Page } from "@playwright/test";
import { ADMIN } from "./fixtures";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Пароль").fill(ADMIN.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByRole("heading", { name: "Главная" })).toBeVisible();
}

test("redirects to login and rejects a wrong password", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Пароль").fill("wrong-password-123");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByText("Неверный email или пароль.")).toBeVisible();
});

test("student, weekly lesson, completed and paid visit", async ({ page }, info) => {
  const name = `Anna ${info.project.name}`;
  await login(page);

  await page.getByRole("link", { name: "Ученики" }).click();
  await page.getByRole("link", { name: "Добавить ученика" }).click();
  await page.getByLabel("Имя").fill(name);
  await page.getByLabel("Ставка в час (₽)").fill("1500,50");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  await page.getByRole("button", { name: "Добавить регулярное занятие" }).click();
  await page.getByLabel("Время начала").fill("18:00");
  await page.getByRole("button", { name: "Сохранить расписание" }).click();
  const history = page.getByRole("region", { name: "История занятий" });
  await expect(history.getByRole("listitem").first()).toBeVisible();
  expect(await history.getByRole("listitem").count()).toBeGreaterThanOrEqual(8);

  await page.getByRole("link", { name: "Добавить занятие" }).click();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Дата").fill(yesterday);
  await page.getByLabel("Время").fill("10:00");
  await page.getByRole("button", { name: "Сохранить занятие" }).click();
  await expect(page).toHaveURL(/\/visits$/);

  const row = page.getByRole("listitem").filter({ hasText: name }).filter({ hasText: "10:00" });
  await row.getByRole("button", { name: "Проведено" }).click();
  await row.getByRole("button", { name: "Отметить оплату" }).click();
  await expect(row.getByRole("button", { name: "Оплачено (отменить)" })).toBeVisible();
  await expect(row).toContainText(/1\s500,50\s₽/);

  const chipPattern = new RegExp(`10:00.*${name}`);
  await page.goto(`/calendar?date=${yesterday}`);
  const weekChip = page.getByRole("link", { name: chipPattern });
  await expect(weekChip).toBeVisible();
  await weekChip.click();
  await expect(page).toHaveURL(/\/visits\/.+\/edit$/);

  await page.goto(`/calendar?view=month&date=${yesterday}`);
  await expect(page.getByRole("link", { name: chipPattern })).toBeVisible();
});

test("analytics per-student totals match seeded data", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Аналитика" }).click();
  const row = page.getByRole("row", { name: /Seeded Student/ });
  await expect(row.getByRole("cell")).toHaveText([
    "Seeded Student", "2", "1,5", /3\s000\s₽/, /2\s000\s₽/, /1\s000\s₽/, "67%",
  ]);
});

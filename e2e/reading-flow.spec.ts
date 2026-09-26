import { expect, test } from '@playwright/test';

test('new user can create a book and keep a dog ear', async ({ page }) => {
  const email = `acceptance-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码', { exact: true }).fill('acceptance-password');
  await page.getByLabel('确认密码').fill('acceptance-password');
  await page.getByRole('button', { name: '创建账号' }).click();

  await expect(page.getByRole('heading', { name: '我的书' })).toBeVisible();
  await page.getByRole('link', { name: '添加第一本书' }).click();
  await page.getByLabel('书名').fill('验收测试书');
  await page.getByLabel('总页数').fill('300');
  await page.getByRole('button', { name: '保存书目' }).click();

  await expect(page.getByRole('heading', { name: '验收测试书' })).toBeVisible();
  await page.getByRole('button', { name: '记一次折角' }).click();
  await page.getByLabel('页码').fill('42');
  await page.getByLabel('折角原因（可选）').fill('这一页与当下有关。');
  await page.getByRole('button', { name: '保存痕迹' }).click();

  await expect(page.getByText('第 42 页').first()).toBeVisible();
  await expect(page.getByText('这一页与当下有关。')).toBeVisible();
});

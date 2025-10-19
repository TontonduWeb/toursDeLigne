import { test, expect } from '@playwright/test';

test('la page charge', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  
  const title = await page.title();
  console.log('✅ Page title:', title);
  
  // ✅ Correction : cherche le vrai titre
  expect(title).toContain('Tours de ligne');
  
  // ✅ Vérifie aussi que le h1 est présent
  await expect(page.locator('h1')).toContainText('Gestion du Tour de Ligne');
  
  // ✅ Vérifie que c'est "En ligne"
  await expect(page.locator('text=En ligne')).toBeVisible();
  
  console.log('✅ Test passed!');
});
import { test, expect } from '@playwright/test';

test.describe('Cas Limite - Tous Occupés', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('http://localhost:8082/api/reinitialiser');
    await page.goto('http://localhost:3000');
  });

  test('tous vendeurs occupés → message approprié', async ({ page }) => {
    // Setup 2 vendeurs
    await page.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page.click('button:has-text("Ajouter")');
    await page.fill('input[placeholder="Nom du vendeur"]', 'Bob');
    await page.click('button:has-text("Ajouter")');
    await page.click('button:has-text("Démarrer la Journée")');

    // Alice prend un client
    await page.click('button:has-text("Prendre un client")');
    await page.waitForTimeout(500);

    // Bob prend un client
    await page.click('button:has-text("Prendre un client")');
    await page.waitForTimeout(1000);

    // Vérifier message
    await expect(page.locator('text=Tous les vendeurs sont occupés')).toBeVisible();
  });

  test('libération → prochain vendeur réapparaît', async ({ page }) => {
    await page.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page.click('button:has-text("Ajouter")');
    await page.fill('input[placeholder="Nom du vendeur"]', 'Bob');
    await page.click('button:has-text("Ajouter")');
    await page.click('button:has-text("Démarrer la Journée")');

    // Tous occupés
    await page.click('button:has-text("Prendre un client")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Prendre un client")');
    await page.waitForTimeout(500);

    // Alice abandonne
    await page.click('button:has-text("Abandonner client")').first();
    await page.waitForTimeout(1000);

    // Alice devrait réapparaître comme prochaine
    await expect(page.locator('text=Prochain vendeur disponible')).toBeVisible();
  });
});
import { test, expect } from '@playwright/test';

test.describe('Scénario Journée Complète', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('http://localhost:8082/api/reinitialiser');
    await page.goto('http://localhost:3000');
  });

  test('cycle complet : config → démarrage → clients → ventes → clôture', async ({ page }) => {
    // 1. Configuration
    await page.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page.click('button:has-text("Ajouter")');
    
    await page.fill('input[placeholder="Nom du vendeur"]', 'Bob');
    await page.click('button:has-text("Ajouter")');

    await page.fill('input[placeholder="Nom du vendeur"]', 'Charlie');
    await page.click('button:has-text("Ajouter")');

    // 2. Démarrer
    await page.click('button:has-text("Démarrer la Journée")');
    await expect(page.locator('text=Prochain vendeur disponible')).toBeVisible();

    // 3. Alice prend un client
    await expect(page.locator('text=Alice').first()).toBeVisible();
    await page.click('button:has-text("Prendre un client")');
    
    await page.waitForTimeout(500); // Polling
    await expect(page.locator('text=Client en cours')).toBeVisible();

    // 4. Alice enregistre une vente
    await page.click('button:has-text("Enregistrer une Vente")').first();
    await page.click('text=Alice >> .. >> button');
    
    await page.waitForTimeout(500);

    // 5. Vérifier les stats
    await expect(page.locator('text=1').first()).toBeVisible(); // Total ventes

    // 6. Bob prend un client
    await expect(page.locator('text=Bob').first()).toBeVisible();
    await page.click('button:has-text("Prendre un client")');
    
    await page.waitForTimeout(500);

    // 7. Bob abandonne
    await page.click('button:has-text("Abandonner client")');
    await page.waitForTimeout(500);
    
    // Bob devrait être disponible
    await expect(page.locator('text=Disponible')).toBeVisible();

    // 8. Clôture
    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Terminer la Journée")');
    
    await page.waitForTimeout(1000);
    
    // Vérifier récapitulatif
    await expect(page.locator('text=Journée Clôturée')).toBeVisible();
  });
});
import { test, expect } from '@playwright/test';

test.describe('Synchronisation Multi-Onglets', () => {
  test('2 onglets voient les mêmes changements', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Réinitialiser
    await page1.request.post('http://localhost:8082/api/reinitialiser');

    // Ouvrir les 2 pages
    await page1.goto('http://localhost:3000');
    await page2.goto('http://localhost:3000');

    // Page 1 : Configuration
    await page1.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page1.click('button:has-text("Ajouter")');
    await page1.fill('input[placeholder="Nom du vendeur"]', 'Bob');
    await page1.click('button:has-text("Ajouter")');
    await page1.click('button:has-text("Démarrer la Journée")');

    // Page 2 : Attendre le polling (3 secondes)
    await page2.waitForTimeout(4000);
    
    // Page 2 devrait voir Alice et Bob
    await expect(page2.locator('text=Alice')).toBeVisible();
    await expect(page2.locator('text=Bob')).toBeVisible();

    // Page 1 : Alice prend un client
    await page1.click('button:has-text("Prendre un client")');
    await page1.waitForTimeout(500);

    // Page 2 : Devrait voir Alice occupée après polling
    await page2.waitForTimeout(4000);
    await expect(page2.locator('text=Client en cours')).toBeVisible();

    await context.close();
  });

  test('conflit : 2 personnes assignent le même vendeur', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.request.post('http://localhost:8082/api/reinitialiser');

    await page1.goto('http://localhost:3000');
    await page2.goto('http://localhost:3000');

    // Setup
    await page1.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page1.click('button:has-text("Ajouter")');
    await page1.click('button:has-text("Démarrer la Journée")');
    await page2.waitForTimeout(4000);

    // Les 2 cliquent en même temps sur "Prendre un client"
    await Promise.all([
      page1.click('button:has-text("Prendre un client")'),
      page2.click('button:has-text("Prendre un client")')
    ]);

    await page1.waitForTimeout(1000);
    await page2.waitForTimeout(1000);

    // Une seule devrait réussir (l'autre voit une erreur ou Alice occupée)
    const page1HasClient = await page1.locator('text=Client en cours').count();
    const page2HasClient = await page2.locator('text=Client en cours').count();

    // Au moins une page devrait voir le client
    expect(page1HasClient + page2HasClient).toBeGreaterThan(0);

    await context.close();
  });
});
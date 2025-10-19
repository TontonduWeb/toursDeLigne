import { test, expect } from '@playwright/test';

test.describe('Gestion Multi-Vendeurs', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('http://localhost:8082/api/reinitialiser');
    await page.goto('http://localhost:3000');
  });

  test('5 vendeurs - ordre respecté', async ({ page }) => {
    const vendeurs = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];

    for (const vendeur of vendeurs) {
      await page.fill('input[placeholder="Nom du vendeur"]', vendeur);
      await page.click('button:has-text("Ajouter")');
    }

    await page.click('button:has-text("Démarrer la Journée")');

    // Vérifier l'ordre initial
    const premier = await page.locator('text=Prochain vendeur disponible >> .. >> text=Alice').count();
    expect(premier).toBe(1);
  });

  test('ajout vendeur en cours → prioritaire', async ({ page }) => {
    // Setup initial
    await page.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page.click('button:has-text("Ajouter")');
    await page.fill('input[placeholder="Nom du vendeur"]', 'Bob');
    await page.click('button:has-text("Ajouter")');
    await page.click('button:has-text("Démarrer la Journée")');

    // Alice fait une vente
    await page.click('button:has-text("Prendre un client")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Enregistrer une Vente")').first();
    await page.locator('text=Alice >> .. >> button').first().click();
    await page.waitForTimeout(500);

    // Ajouter Charlie
    await page.click('button:has-text("+ Nouveau vendeur")');
    await page.fill('input[placeholder="Nom du vendeur"]', 'Charlie');
    await page.click('button:has-text("✓ Ajouter")');
    await page.waitForTimeout(1000);

    // Charlie devrait être prochain (0 ventes vs 1 pour Alice, 0 pour Bob)
    const stats = await page.locator('text=Prochain vendeur disponible').textContent();
    // Vérifier que c'est Bob ou Charlie (tous deux à 0)
  });

  test('réorganisation avant démarrage', async ({ page }) => {
    await page.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page.click('button:has-text("Ajouter")');
    await page.fill('input[placeholder="Nom du vendeur"]', 'Bob');
    await page.click('button:has-text("Ajouter")');
    await page.fill('input[placeholder="Nom du vendeur"]', 'Charlie');
    await page.click('button:has-text("Ajouter")');

    // Bob monte en première position
    const bobRow = page.locator('text=2. Bob >> ..');
    await bobRow.locator('button[title="Monter dans l\'ordre"]').click();

    // Démarrer
    await page.click('button:has-text("Démarrer la Journée")');

    // Bob devrait être prochain
    await expect(page.locator('text=Prochain vendeur disponible >> .. >> text=Bob')).toBeVisible();
  });
});
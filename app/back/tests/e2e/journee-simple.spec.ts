import { test, expect } from '@playwright/test';

test.describe('Scénario Journée Simple', () => {
  test.beforeEach(async ({ request }) => {
    // Réinitialiser avant chaque test
    await request.post('http://localhost:8082/api/reinitialiser');
  });

  test('cycle complet : config → démarrage → vente → clôture', async ({ page }) => {
    // 1. Aller sur l'app
    await page.goto('http://localhost:3000');

    // 2. Ajouter Alice
    await page.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page.click('button:has-text("Ajouter")');
    
    // 3. Ajouter Bob
    await page.fill('input[placeholder="Nom du vendeur"]', 'Bob');
    await page.click('button:has-text("Ajouter")');

    // 4. Démarrer la journée
    await page.click('button:has-text("Démarrer la Journée")');
    
    // Attendre que la page charge
    await page.waitForTimeout(2000);

    // 5. Vérifier que le premier vendeur est affiché
    await expect(page.locator('text=Prochain vendeur disponible')).toBeVisible();
    await expect(page.locator('text=Alice').first()).toBeVisible();

    // 6. Alice prend un client
    await page.click('button:has-text("Prendre un client")');
    await page.waitForTimeout(1000);

    // 7. Vérifier qu'Alice a un client
    await expect(page.locator('text=Client en cours')).toBeVisible();

    // 8. Alice enregistre une vente
    const venteButtons = page.locator('button', { hasText: 'Alice' });
    await venteButtons.first().click();
    await page.waitForTimeout(1000);

    // 9. Vérifier que les stats sont mises à jour
    await expect(page.locator('text=1').first()).toBeVisible();

    console.log('✅ Test cycle complet réussi !');
  });

  test('ajout vendeur en cours de journée', async ({ page }) => {
    // Setup initial
    await page.goto('http://localhost:3000');
    
    await page.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page.click('button:has-text("Ajouter")');
    await page.click('button:has-text("Démarrer la Journée")');
    await page.waitForTimeout(2000);

    // Ajouter Bob pendant la journée
    await page.click('button:has-text("+ Nouveau vendeur")');
    await page.fill('input[placeholder="Nom du vendeur"]', 'Bob');
    await page.click('button:has-text("✓ Ajouter")');
    await page.waitForTimeout(2000);

    // Vérifier que Bob apparaît
    await expect(page.locator('text=Bob')).toBeVisible();

    console.log('✅ Test ajout vendeur réussi !');
  });

  test('abandon client', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Setup
    await page.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page.click('button:has-text("Ajouter")');
    await page.click('button:has-text("Démarrer la Journée")');
    await page.waitForTimeout(2000);

    // Prendre un client
    await page.click('button:has-text("Prendre un client")');
    await page.waitForTimeout(1000);

    // Abandonner
    await page.click('button:has-text("Abandonner client")');
    await page.waitForTimeout(1000);

    // Vérifier que Alice est à nouveau disponible
    await expect(page.locator('text=Disponible')).toBeVisible();

    console.log('✅ Test abandon client réussi !');
  });
});
import { test, expect } from '@playwright/test';

test.describe('Tour de Ligne App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Réinitialiser via l'API
    await page.request.post('http://localhost:8082/api/reinitialiser');
  });

  test('devrait démarrer une journée', async ({ page }) => {
    // Ajouter des vendeurs
    await page.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page.click('button:has-text("Ajouter")');
    
    await page.fill('input[placeholder="Nom du vendeur"]', 'Bob');
    await page.click('button:has-text("Ajouter")');

    // Démarrer
    await page.click('button:has-text("Démarrer la Journée")');

    // Vérifier
    await expect(page.locator('text=Prochain vendeur disponible')).toBeVisible();
  });

  test('devrait gérer un cycle client complet', async ({ page }) => {
    // Setup
    await page.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page.click('button:has-text("Ajouter")');
    await page.click('button:has-text("Démarrer la Journée")');

    // Prendre client
    await page.click('button:has-text("Prendre un client")');
    await expect(page.locator('text=Client en cours')).toBeVisible();

    // Abandonner
    await page.click('button:has-text("Abandonner client")');
    
    // Attendre la mise à jour
    await page.waitForTimeout(500);
    
    // Vérifier disponibilité
    await expect(page.locator('text=Disponible')).toBeVisible();
  });

  test('devrait empêcher double abandon', async ({ page }) => {
    // Setup
    await page.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page.click('button:has-text("Ajouter")');
    await page.click('button:has-text("Démarrer la Journée")');

    // Prendre et abandonner
    await page.click('button:has-text("Prendre un client")');
    await page.click('button:has-text("Abandonner client")');
    
    await page.waitForTimeout(500);

    // Vérifier que le bouton abandon n'est plus là
    await expect(page.locator('button:has-text("Abandonner client")')).not.toBeVisible();
  });
});
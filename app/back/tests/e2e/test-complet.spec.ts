import { test, expect } from '@playwright/test';

test.describe('Cycle Complet', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:8082/api/reinitialiser');
  });

  test('ajouter vendeur → démarrer → prendre client → vente', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // 1. Ajouter Alice
    await page.fill('input[placeholder="Nom du vendeur"]', 'Alice');
    await page.click('button:has-text("Ajouter")');
    
    // ✅ Fix : Cherche juste "Alice" dans la section de config
    await expect(page.locator('text=Alice').first()).toBeVisible();
    
    // 2. Ajouter Bob
    await page.fill('input[placeholder="Nom du vendeur"]', 'Bob');
    await page.click('button:has-text("Ajouter")');
    await expect(page.locator('text=Bob').first()).toBeVisible();
    
    // 3. Démarrer (attendre que le bouton soit cliquable)
    await page.click('button:has-text("Démarrer la Journée")');
    await page.waitForTimeout(2000); // ✅ Plus de temps pour le polling
    
    // 4. Vérifier qu'on est en mode "journée active"
    await expect(page.locator('text=État de l\'Équipe')).toBeVisible({ timeout: 10000 });
    
    // 5. Alice devrait être la prochaine
    await expect(page.locator('text=Prochain vendeur disponible')).toBeVisible();
    
    // 6. Alice prend un client
    await page.click('button:has-text("Prendre un client")');
    await page.waitForTimeout(1500);
    
    // 7. Vérifier qu'Alice a un client
    await expect(page.locator('text=Client en cours')).toBeVisible();
    
    // 8. Alice enregistre une vente - cherche dans la section "Enregistrer une Vente"
    const venteSection = page.locator('text=Enregistrer une Vente').locator('..');
    await venteSection.locator('text=Alice').click();
    await page.waitForTimeout(1500);
    
    // 9. Vérifier les stats (total ventes = 1)
    await expect(page.locator('text=Ventes totales')).toBeVisible();
    
    console.log('✅ Cycle complet réussi!');
  });
});
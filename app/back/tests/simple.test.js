describe('Test de base', () => {
  it('devrait passer', () => {
    expect(1 + 1).toBe(2);
  });

  it('devrait vérifier un objet', () => {
    const vendeur = { nom: 'Alice', ventes: 0 };
    expect(vendeur.nom).toBe('Alice');
    expect(vendeur.ventes).toBe(0);
  });
});
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { VendeurData, HistoriqueItem } from '../../types';

// ==================== MOCKS D'API ====================

// État initial : aucun vendeur (phase de configuration)
export const mockServerStateVide = {
  ordreActuel: {
    prochainVendeur: null,
  },
  vendeurs: [],
  historique: [],
};

export const mockServerState = {
  ordreActuel: {
    prochainVendeur: 'Alice',
  },
  vendeurs: [
    {
      nom: 'Alice',
      ventes: 0,
      clientEnCours: null,
    },
    {
      nom: 'Bob',
      ventes: 0,
      clientEnCours: null,
    },
  ],
  historique: [],
};

export const mockServerStateAvecClient = {
  ordreActuel: {
    prochainVendeur: 'Bob',
  },
  vendeurs: [
    {
      nom: 'Alice',
      ventes: 0,
      clientEnCours: {
        id: 'client-123',
        heureDebut: '10:30:00',
        dateDebut: '23/10/2025',
      },
    },
    {
      nom: 'Bob',
      ventes: 0,
      clientEnCours: null,
    },
  ],
  historique: [
    {
      date: '23/10/2025',
      heure: '10:30:00',
      action: 'Client pris en charge par Alice',
      vendeur: 'Alice',
      clientId: 'client-123',
    },
  ],
};

export const mockServerStateApresVente = {
  ordreActuel: {
    prochainVendeur: 'Alice',
  },
  vendeurs: [
    {
      nom: 'Alice',
      ventes: 1,
      clientEnCours: null,
    },
    {
      nom: 'Bob',
      ventes: 0,
      clientEnCours: null,
    },
  ],
  historique: [
    {
      date: '23/10/2025',
      heure: '10:35:00',
      action: 'Vente finalisée par Alice',
      vendeur: 'Alice',
      clientId: 'client-123',
    },
    {
      date: '23/10/2025',
      heure: '10:30:00',
      action: 'Client pris en charge par Alice',
      vendeur: 'Alice',
      clientId: 'client-123',
    },
  ],
};

// ==================== MOCK DE FETCH ====================

export const setupFetchMock = (responses: any[] = [mockServerStateVide]) => {
  let callCount = 0;
  
  (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
    // POST endpoints
    if (options?.method === 'POST') {
      if (url.includes('/api/demarrer-journee')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, message: 'Journée démarrée' }),
        });
      }
      
      if (url.includes('/api/prendre-client')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, clientId: 'client-123' }),
        });
      }
      
      if (url.includes('/api/abandonner-client')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      
      if (url.includes('/api/enregistrer-vente')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      
      if (url.includes('/api/ajouter-vendeur')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, vendeur: 'Charlie' }),
        });
      }
      
      if (url.includes('/api/terminer-journee')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Journée clôturée',
            exportData: {
              dateClôture: '23/10/2025',
              heureClôture: '18:00:00',
              statistiques: {
                totalVendeurs: 2,
                totalVentes: 5,
                moyenneVentes: 2.5,
              },
              vendeurs: responses[callCount]?.vendeurs || [],
              historique: [],
            },
          }),
        });
      }
      
      if (url.includes('/api/reinitialiser')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
    }
    
    // GET /api/state
    if (url.includes('/api/state')) {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
      });
    }
    
    return Promise.reject(new Error(`URL non mockée: ${url}`));
  });
};

// ==================== CUSTOM RENDER ====================

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { ...options });
};

export * from '@testing-library/react';
export { customRender as render };

// ==================== HELPERS ====================

export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 100));
};

export const createMockVendeurData = (overrides?: Partial<VendeurData>): VendeurData => ({
  nom: 'Test Vendeur',
  compteurVentes: 0,
  clientEnCours: undefined,
  ...overrides,
});

export const createMockHistoriqueItem = (overrides?: Partial<HistoriqueItem>): HistoriqueItem => ({
  action: 'vente',
  vendeur: 'Test Vendeur',
  date: '23/10/2025',
  heure: '10:00:00',
  ...overrides,
});
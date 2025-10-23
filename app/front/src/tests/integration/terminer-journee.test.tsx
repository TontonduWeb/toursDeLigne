import React from 'react';
import { render, screen, waitFor } from '../utils/testUtils';
import userEvent from '@testing-library/user-event';
import TourDeLigneApp from '../../components/TourDeLigneApp';
import { setupFetchMock, mockServerStateApresVente } from '../utils/testUtils';

describe('Terminer la Journée - Test d\'intégration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    
    // Mock de window.confirm
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    
    // Mock de window.alert
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    // Mock de Blob et URL.createObjectURL pour le téléchargement
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
    global.Blob = jest.fn((content, options) => ({
      content,
      options,
    })) as any;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('devrait clôturer la journée et afficher le récapitulatif', async () => {
    setupFetchMock([mockServerStateApresVente]);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    // Attendre que la journée soit active
    await waitFor(() => {
      expect(screen.getByText(/État de l'Équipe/i)).toBeInTheDocument();
    });

    // Act: Terminer la journée
    await user.click(screen.getByRole('button', { name: /Terminer la Journée/i }));

    jest.advanceTimersByTime(2000);

    // Assert: Confirmation demandée
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('ATTENTION - Action irréversible')
    );

    // Assert: Le récapitulatif doit s'afficher
    await waitFor(() => {
      expect(screen.getByText(/Journée Clôturée/i)).toBeInTheDocument();
    });

    // Assert: Les statistiques doivent être affichées
    expect(screen.getByText(/Ventes totales/i)).toBeInTheDocument();
    expect(screen.getByText(/Moyenne\/vendeur/i)).toBeInTheDocument();
  });

  test('ne devrait pas clôturer si l\'utilisateur annule', async () => {
    // Mock: Utilisateur refuse la confirmation
    (window.confirm as jest.Mock).mockImplementation(() => false);

    setupFetchMock([mockServerStateApresVente]);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(screen.getByText(/État de l'Équipe/i)).toBeInTheDocument();
    });

    // Act: Tenter de terminer la journée
    await user.click(screen.getByRole('button', { name: /Terminer la Journée/i }));

    // Assert: La journée ne doit pas être clôturée
    expect(screen.queryByText(/Journée Clôturée/i)).not.toBeInTheDocument();
    
    // Assert: L'interface de gestion doit toujours être visible
    expect(screen.getByText(/État de l'Équipe/i)).toBeInTheDocument();
  });

  test('devrait télécharger automatiquement l\'export JSON', async () => {
    setupFetchMock([mockServerStateApresVente]);

    const createElementSpy = jest.spyOn(document, 'createElement');
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(screen.getByText(/État de l'Équipe/i)).toBeInTheDocument();
    });

    // Act: Terminer la journée
    await user.click(screen.getByRole('button', { name: /Terminer la Journée/i }));

    jest.advanceTimersByTime(2000);

    // Assert: Un élément <a> doit être créé pour le téléchargement
    await waitFor(() => {
      expect(createElementSpy).toHaveBeenCalledWith('a');
    });

    // Assert: URL.createObjectURL appelé
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  test('devrait réinitialiser tous les états après clôture', async () => {
    const responses = [
      mockServerStateApresVente,
      { ordreActuel: { prochainVendeur: null }, vendeurs: [], historique: [] }, // Après clôture
    ];
    setupFetchMock(responses);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(screen.getByText(/État de l'Équipe/i)).toBeInTheDocument();
    });

    // Act: Terminer la journée
    await user.click(screen.getByRole('button', { name: /Terminer la Journée/i }));

    jest.advanceTimersByTime(2000);

    // Fermer le récapitulatif
    await waitFor(() => {
      expect(screen.getByText(/Fermer le récapitulatif/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Fermer le récapitulatif/i }));

    jest.advanceTimersByTime(2000);

    // Assert: Retour à l'écran de configuration
    await waitFor(() => {
      expect(screen.getByText(/Configuration des Vendeurs/i)).toBeInTheDocument();
    });

    // Assert: Plus de vendeurs affichés
    expect(screen.queryByText(/Alice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bob/i)).not.toBeInTheDocument();
  });

  test('devrait afficher les ventes par vendeur dans le récapitulatif', async () => {
    const mockExportData = {
      ordreActuel: { prochainVendeur: null },
      vendeurs: [
        { nom: 'Alice', ventes: 3, clientEnCours: null },
        { nom: 'Bob', ventes: 2, clientEnCours: null },
      ],
      historique: [],
    };
    setupFetchMock([mockExportData]);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(screen.getByText(/État de l'Équipe/i)).toBeInTheDocument();
    });

    // Act: Terminer la journée
    await user.click(screen.getByRole('button', { name: /Terminer la Journée/i }));

    jest.advanceTimersByTime(2000);

    // Assert: Les ventes doivent être affichées
    await waitFor(() => {
      expect(screen.getByText(/3 ventes/i)).toBeInTheDocument();
      expect(screen.getByText(/2 ventes/i)).toBeInTheDocument();
    });
  });

  test('devrait trier les vendeurs par nombre de ventes dans le récapitulatif', async () => {
    const mockExportData = {
      ordreActuel: { prochainVendeur: null },
      vendeurs: [
        { nom: 'Alice', ventes: 1, clientEnCours: null },
        { nom: 'Bob', ventes: 5, clientEnCours: null },
        { nom: 'Charlie', ventes: 3, clientEnCours: null },
      ],
      historique: [],
    };
    setupFetchMock([mockExportData]);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(screen.getByText(/État de l'Équipe/i)).toBeInTheDocument();
    });

    // Act: Terminer la journée
    await user.click(screen.getByRole('button', { name: /Terminer la Journée/i }));

    jest.advanceTimersByTime(2000);

    // Assert: L'ordre doit être Bob (5), Charlie (3), Alice (1)
    await waitFor(() => {
      const vendeurElements = screen.getAllByText(/#\d+/);
      expect(vendeurElements[0]).toHaveTextContent('#1');
      expect(screen.getByText(/Bob/i)).toBeInTheDocument();
    });
  });

  test('devrait indiquer si un vendeur a encore un client en cours', async () => {
    const mockExportData = {
      ordreActuel: { prochainVendeur: null },
      vendeurs: [
        { 
          nom: 'Alice', 
          ventes: 2, 
          clientEnCours: { id: 'client-123', heureDebut: '10:00', dateDebut: '23/10/2025' } 
        },
        { nom: 'Bob', ventes: 3, clientEnCours: null },
      ],
      historique: [],
    };
    setupFetchMock([mockExportData]);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(screen.getByText(/État de l'Équipe/i)).toBeInTheDocument();
    });

    // Act: Terminer la journée
    await user.click(screen.getByRole('button', { name: /Terminer la Journée/i }));

    jest.advanceTimersByTime(2000);

    // Assert: Le message "client en cours non finalisé" doit être affiché
    await waitFor(() => {
      expect(screen.getByText(/client en cours non finalisé/i)).toBeInTheDocument();
    });
  });
});

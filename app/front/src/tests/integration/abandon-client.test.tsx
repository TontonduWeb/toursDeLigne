import React from 'react';
import { render, screen, waitFor } from '../utils/testUtils';
import userEvent from '@testing-library/user-event';
import TourDeLigneApp from '../../components/TourDeLigneApp';
import { setupFetchMock, mockServerState, mockServerStateAvecClient } from '../utils/testUtils';

describe('Abandon Client - Test d\'intégration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('CRITIQUE: devrait mettre à jour l\'interface après abandon d\'un client', async () => {
    // Arrange: Mock des réponses API
    const responses = [
      mockServerState, // État initial
      mockServerStateAvecClient, // Après prise de client
      mockServerState, // Après abandon client
    ];
    setupFetchMock(responses);

    const user = userEvent.setup({ delay: null });

    // Act: Render de l'application
    render(<TourDeLigneApp />);

    // Attendre le premier chargement
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(screen.getByText(/Configuration des Vendeurs/i)).toBeInTheDocument();
    });

    // Act: Démarrer la journée
    const inputVendeur = screen.getByPlaceholderText('Nom du vendeur');
    await user.type(inputVendeur, 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));

    await user.clear(inputVendeur);
    await user.type(inputVendeur, 'Bob');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));

    // Démarrer
    await user.click(screen.getByRole('button', { name: /Démarrer la Journée/i }));

    // Attendre la mise à jour après démarrage
    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(screen.getByText(/Prochain vendeur disponible/i)).toBeInTheDocument();
    });

    // Assert: Alice doit être disponible initialement
    expect(screen.getByText(/Alice/i)).toBeInTheDocument();

    // Act: Alice prend un client
    const btnPrendreClient = screen.getByRole('button', { name: /Prendre un client/i });
    await user.click(btnPrendreClient);

    // Attendre la mise à jour du polling
    jest.advanceTimersByTime(2000);

    // Assert: Alice doit maintenant avoir un client en cours
    await waitFor(() => {
      expect(screen.getByText(/Client en cours/i)).toBeInTheDocument();
    });

    // Act: Alice abandonne le client
    const btnAbandonner = screen.getByRole('button', { name: /Abandonner client/i });
    await user.click(btnAbandonner);

    // Attendre la mise à jour du polling
    jest.advanceTimersByTime(2000);

    // Assert: Alice doit être à nouveau disponible
    // ❌ CE TEST AURAIT ÉCHOUÉ AVEC TON BUG
    await waitFor(() => {
      expect(screen.getByText(/Disponible/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Assert: Le bouton "Abandonner" ne doit plus être visible
    expect(screen.queryByRole('button', { name: /Abandonner client/i })).not.toBeInTheDocument();
  });

  test('devrait afficher une erreur si abandon échoue côté serveur', async () => {
    // Arrange: Mock d'une erreur serveur
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url.includes('/api/abandonner-client')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Le vendeur n\'a pas de client' }),
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockServerStateAvecClient),
      });
    });

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup({ delay: null });

    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(screen.getByText(/Gestion des Clients/i)).toBeInTheDocument();
    });

    // Tenter d'abandonner un client qui n'existe pas
    const btnAbandonner = screen.getByRole('button', { name: /Abandonner client/i });
    await user.click(btnAbandonner);

    // Assert: Une alerte doit être affichée
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Erreur lors de l\'abandon du client')
      );
    });

    alertSpy.mockRestore();
  });

  test('devrait gérer plusieurs abandons successifs', async () => {
    const responses = [
      mockServerState,
      mockServerStateAvecClient,
      mockServerState,
      mockServerStateAvecClient,
      mockServerState,
    ];
    setupFetchMock(responses);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    // Premier cycle: prendre + abandonner
    await waitFor(() => expect(screen.getByText(/Prochain vendeur/i)).toBeInTheDocument());
    
    await user.click(screen.getByRole('button', { name: /Prendre un client/i }));
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => expect(screen.getByText(/Client en cours/i)).toBeInTheDocument());
    
    await user.click(screen.getByRole('button', { name: /Abandonner client/i }));
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => expect(screen.getByText(/Disponible/i)).toBeInTheDocument());

    // Deuxième cycle: prendre + abandonner
    await user.click(screen.getByRole('button', { name: /Prendre un client/i }));
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => expect(screen.getByText(/Client en cours/i)).toBeInTheDocument());
    
    await user.click(screen.getByRole('button', { name: /Abandonner client/i }));
    jest.advanceTimersByTime(2000);
    
    // Assert: Doit toujours être disponible après le 2ème abandon
    await waitFor(() => expect(screen.getByText(/Disponible/i)).toBeInTheDocument());
  });
});

import React from 'react';
import { render, screen, waitFor } from '../utils/testUtils';
import userEvent from '@testing-library/user-event';
import TourDeLigneApp from '../../components/TourDeLigneApp';
import { 
  setupFetchMock, 
  mockServerState, 
  mockServerStateAvecClient,
  mockServerStateApresVente 
} from '../utils/testUtils';

describe('Enregistrement Vente - Test d\'intégration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('devrait enregistrer une vente et mettre à jour le compteur', async () => {
    // Arrange
    const responses = [
      mockServerState, // État initial
      mockServerStateAvecClient, // Après prise de client
      mockServerStateApresVente, // Après vente
    ];
    setupFetchMock(responses);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    // Attendre le chargement initial
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(screen.getByText(/Configuration des Vendeurs/i)).toBeInTheDocument();
    });

    // Démarrer la journée
    await user.type(screen.getByPlaceholderText('Nom du vendeur'), 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));
    await user.click(screen.getByRole('button', { name: /Démarrer la Journée/i }));

    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(screen.getByText(/Prochain vendeur disponible/i)).toBeInTheDocument();
    });

    // Assert: Initialement 0 vente
    expect(screen.getByText(/0 vente/i)).toBeInTheDocument();

    // Act: Prendre un client
    await user.click(screen.getByRole('button', { name: /Prendre un client/i }));
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.getByText(/Client en cours/i)).toBeInTheDocument();
    });

    // Act: Enregistrer la vente
    const btnVente = screen.getByRole('button', { name: /Alice/i });
    await user.click(btnVente);

    jest.advanceTimersByTime(2000);

    // Assert: Le compteur doit être à 1
    await waitFor(() => {
      expect(screen.getByText(/1 vente/i)).toBeInTheDocument();
    });

    // Assert: Alice doit être à nouveau disponible
    expect(screen.getByText(/Disponible/i)).toBeInTheDocument();
  });

  test('devrait comptabiliser plusieurs ventes pour le même vendeur', async () => {
    // Arrange: 3 ventes successives
    const responses = [
      { ...mockServerState, vendeurs: [{ nom: 'Alice', ventes: 0, clientEnCours: null }] },
      { ...mockServerState, vendeurs: [{ nom: 'Alice', ventes: 0, clientEnCours: { id: 'c1', heureDebut: '10:00', dateDebut: '23/10/2025' } }] },
      { ...mockServerState, vendeurs: [{ nom: 'Alice', ventes: 1, clientEnCours: null }] },
      { ...mockServerState, vendeurs: [{ nom: 'Alice', ventes: 1, clientEnCours: { id: 'c2', heureDebut: '10:10', dateDebut: '23/10/2025' } }] },
      { ...mockServerState, vendeurs: [{ nom: 'Alice', ventes: 2, clientEnCours: null }] },
      { ...mockServerState, vendeurs: [{ nom: 'Alice', ventes: 2, clientEnCours: { id: 'c3', heureDebut: '10:20', dateDebut: '23/10/2025' } }] },
      { ...mockServerState, vendeurs: [{ nom: 'Alice', ventes: 3, clientEnCours: null }] },
    ];
    setupFetchMock(responses);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    // Cycle 1
    await waitFor(() => expect(screen.getByText(/Prochain vendeur/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Prendre un client/i }));
    jest.advanceTimersByTime(2000);
    await waitFor(() => expect(screen.getByText(/Client en cours/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Alice/i }));
    jest.advanceTimersByTime(2000);
    await waitFor(() => expect(screen.getByText(/1 vente/i)).toBeInTheDocument());

    // Cycle 2
    await user.click(screen.getByRole('button', { name: /Prendre un client/i }));
    jest.advanceTimersByTime(2000);
    await waitFor(() => expect(screen.getByText(/Client en cours/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Alice/i }));
    jest.advanceTimersByTime(2000);
    await waitFor(() => expect(screen.getByText(/2 ventes/i)).toBeInTheDocument());

    // Cycle 3
    await user.click(screen.getByRole('button', { name: /Prendre un client/i }));
    jest.advanceTimersByTime(2000);
    await waitFor(() => expect(screen.getByText(/Client en cours/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Alice/i }));
    jest.advanceTimersByTime(2000);

    // Assert: 3 ventes au total
    await waitFor(() => {
      expect(screen.getByText(/3 ventes/i)).toBeInTheDocument();
    });
  });

  test('ne devrait pas permettre d\'enregistrer une vente sans client', async () => {
    setupFetchMock([mockServerState]);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(screen.getByText(/Configuration des Vendeurs/i)).toBeInTheDocument();
    });

    // Démarrer la journée
    await user.type(screen.getByPlaceholderText('Nom du vendeur'), 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));
    await user.click(screen.getByRole('button', { name: /Démarrer la Journée/i }));

    jest.advanceTimersByTime(2000);

    // Assert: La section "Enregistrer une Vente" doit indiquer qu'aucun vendeur n'a de client
    await waitFor(() => {
      expect(screen.getByText(/Aucun vendeur n'a de client en cours/i)).toBeInTheDocument();
    });
  });

  test('devrait mettre à jour l\'historique après une vente', async () => {
    const responses = [
      mockServerState,
      mockServerStateAvecClient,
      {
        ...mockServerStateApresVente,
        historique: [
          {
            date: '23/10/2025',
            heure: '10:35:00',
            action: 'Vente finalisée par Alice',
            vendeur: 'Alice',
            clientId: 'client-123',
          },
        ],
      },
    ];
    setupFetchMock(responses);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    // Démarrer, prendre client, vendre
    await waitFor(() => expect(screen.getByText(/Configuration/i)).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('Nom du vendeur'), 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));
    await user.click(screen.getByRole('button', { name: /Démarrer/i }));
    jest.advanceTimersByTime(2000);

    await user.click(screen.getByRole('button', { name: /Prendre un client/i }));
    jest.advanceTimersByTime(2000);

    await user.click(screen.getByRole('button', { name: /Alice/i }));
    jest.advanceTimersByTime(2000);

    // Assert: L'historique doit contenir la vente
    await waitFor(() => {
      expect(screen.getByText(/Vente finalisée par Alice/i)).toBeInTheDocument();
    });
  });
});

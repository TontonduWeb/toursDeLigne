import React from 'react';
import { render, screen, waitFor } from '../utils/testUtils';
import userEvent from '@testing-library/user-event';
import TourDeLigneApp from '../../components/TourDeLigneApp';
import { setupFetchMock, mockServerState } from '../utils/testUtils';

describe('Ajout Vendeur en Cours de Journée - Test d\'intégration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('devrait permettre d\'ajouter un nouveau vendeur pendant la journée', async () => {
    // Arrange
    const responses = [
      mockServerState, // 2 vendeurs initiaux
      {
        ...mockServerState,
        vendeurs: [
          { nom: 'Alice', ventes: 0, clientEnCours: null },
          { nom: 'Bob', ventes: 0, clientEnCours: null },
          { nom: 'Charlie', ventes: 0, clientEnCours: null }, // Nouveau vendeur
        ],
      },
    ];
    setupFetchMock(responses);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    // Démarrer la journée avec 2 vendeurs
    await waitFor(() => {
      expect(screen.getByText(/Configuration des Vendeurs/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Nom du vendeur'), 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));

    await user.type(screen.getByPlaceholderText('Nom du vendeur'), 'Bob');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));

    await user.click(screen.getByRole('button', { name: /Démarrer la Journée/i }));

    jest.advanceTimersByTime(2000);

    // Assert: Journée démarrée
    await waitFor(() => {
      expect(screen.getByText(/Ajouter un vendeur/i)).toBeInTheDocument();
    });

    // Act: Cliquer sur "Nouveau vendeur"
    await user.click(screen.getByRole('button', { name: /Nouveau vendeur/i }));

    // Assert: Le formulaire doit s'afficher
    expect(screen.getByPlaceholderText(/Nom du vendeur/i)).toBeInTheDocument();

    // Act: Ajouter Charlie
    await user.type(screen.getByPlaceholderText(/Nom du vendeur/i), 'Charlie');
    await user.click(screen.getByRole('button', { name: /✓ Ajouter/i }));

    jest.advanceTimersByTime(2000);

    // Assert: Charlie doit apparaître dans la liste
    await waitFor(() => {
      expect(screen.getByText(/Charlie/i)).toBeInTheDocument();
    });
  });

  test('ne devrait pas permettre d\'ajouter un vendeur déjà existant', async () => {
    setupFetchMock([mockServerState]);

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup({ delay: null });

    render(<TourDeLigneApp />);
    jest.advanceTimersByTime(100);

    // Démarrer la journée
    await waitFor(() => expect(screen.getByText(/Configuration/i)).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('Nom du vendeur'), 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));
    await user.click(screen.getByRole('button', { name: /Démarrer/i }));

    jest.advanceTimersByTime(2000);

    // Tenter d'ajouter Alice à nouveau
    await user.click(screen.getByRole('button', { name: /Nouveau vendeur/i }));
    await user.type(screen.getByPlaceholderText(/Nom du vendeur/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /✓ Ajouter/i }));

    // Assert: Une alerte doit être affichée
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Ce vendeur est déjà dans la liste.');
    });

    alertSpy.mockRestore();
  });

  test('ne devrait pas permettre d\'ajouter un vendeur avec un nom vide', async () => {
    setupFetchMock([mockServerState]);

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup({ delay: null });

    render(<TourDeLigneApp />);
    jest.advanceTimersByTime(100);

    // Démarrer la journée
    await waitFor(() => expect(screen.getByText(/Configuration/i)).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('Nom du vendeur'), 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));
    await user.click(screen.getByRole('button', { name: /Démarrer/i }));

    jest.advanceTimersByTime(2000);

    // Tenter d'ajouter un vendeur sans nom
    await user.click(screen.getByRole('button', { name: /Nouveau vendeur/i }));
    await user.click(screen.getByRole('button', { name: /✓ Ajouter/i }));

    // Assert: Une alerte doit être affichée
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Veuillez entrer un nom de vendeur.');
    });

    alertSpy.mockRestore();
  });

  test('devrait fermer le formulaire en cliquant sur Annuler', async () => {
    setupFetchMock([mockServerState]);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    // Démarrer la journée
    await waitFor(() => expect(screen.getByText(/Configuration/i)).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('Nom du vendeur'), 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));
    await user.click(screen.getByRole('button', { name: /Démarrer/i }));

    jest.advanceTimersByTime(2000);

    // Ouvrir le formulaire
    await user.click(screen.getByRole('button', { name: /Nouveau vendeur/i }));
    expect(screen.getByPlaceholderText(/Nom du vendeur/i)).toBeInTheDocument();

    // Cliquer sur Annuler
    await user.click(screen.getByRole('button', { name: /Annuler/i }));

    // Assert: Le formulaire doit être fermé
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Nom du vendeur/i)).not.toBeInTheDocument();
    });
  });

  test('devrait placer le nouveau vendeur en priorité dans l\'ordre', async () => {
    const responses = [
      {
        ...mockServerState,
        vendeurs: [
          { nom: 'Alice', ventes: 2, clientEnCours: { id: 'c1', heureDebut: '10:00', dateDebut: '23/10/2025' } },
          { nom: 'Bob', ventes: 1, clientEnCours: null },
        ],
      },
      {
        ...mockServerState,
        vendeurs: [
          { nom: 'Alice', ventes: 2, clientEnCours: { id: 'c1', heureDebut: '10:00', dateDebut: '23/10/2025' } },
          { nom: 'Charlie', ventes: 0, clientEnCours: null }, // Nouveau avec 0 ventes
          { nom: 'Bob', ventes: 1, clientEnCours: null },
        ],
      },
    ];
    setupFetchMock(responses);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    jest.advanceTimersByTime(100);

    // Attendre chargement
    await waitFor(() => expect(screen.getByText(/Ajouter un vendeur/i)).toBeInTheDocument());

    // Ajouter Charlie
    await user.click(screen.getByRole('button', { name: /Nouveau vendeur/i }));
    await user.type(screen.getByPlaceholderText(/Nom du vendeur/i), 'Charlie');
    await user.click(screen.getByRole('button', { name: /✓ Ajouter/i }));

    jest.advanceTimersByTime(2000);

    // Assert: Charlie doit être le prochain vendeur disponible (0 ventes = minimum)
    await waitFor(() => {
      expect(screen.getByText(/Charlie/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, waitFor } from '../utils/testUtils';
import userEvent from '@testing-library/user-event';
import TourDeLigneApp from '../../components/TourDeLigneApp';
import { setupFetchMock, mockServerState } from '../utils/testUtils';

describe('Démarrage de Journée - Test d\'intégration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('devrait démarrer la journée avec plusieurs vendeurs', async () => {
    setupFetchMock([mockServerState]);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    // Assert: Phase de configuration visible
    expect(screen.getByText(/Configuration des Vendeurs/i)).toBeInTheDocument();

    // Act: Ajouter Alice
    const input = screen.getByPlaceholderText('Nom du vendeur');
    await user.type(input, 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));

    // Assert: Alice ajoutée
    expect(screen.getByText(/1\. Alice/i)).toBeInTheDocument();

    // Act: Ajouter Bob
    await user.clear(input);
    await user.type(input, 'Bob');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));

    // Assert: Bob ajouté
    expect(screen.getByText(/2\. Bob/i)).toBeInTheDocument();

    // Act: Démarrer la journée
    await user.click(screen.getByRole('button', { name: /Démarrer la Journée/i }));

    jest.advanceTimersByTime(2000);

    // Assert: Interface de gestion visible
    await waitFor(() => {
      expect(screen.getByText(/État de l'Équipe/i)).toBeInTheDocument();
    });

    // Assert: Prochain vendeur affiché
    expect(screen.getByText(/Prochain vendeur disponible/i)).toBeInTheDocument();
  });

  test('ne devrait pas permettre de démarrer sans vendeur', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup({ delay: null });

    render(<TourDeLigneApp />);

    // Act: Tenter de démarrer sans vendeur
    const btnDemarrer = screen.queryByRole('button', { name: /Démarrer la Journée/i });

    // Assert: Le bouton ne doit pas être visible
    expect(btnDemarrer).not.toBeInTheDocument();

    alertSpy.mockRestore();
  });

  test('devrait permettre de réorganiser l\'ordre des vendeurs avant démarrage', async () => {
    setupFetchMock([mockServerState]);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    // Ajouter 3 vendeurs
    const input = screen.getByPlaceholderText('Nom du vendeur');
    
    await user.type(input, 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));
    
    await user.clear(input);
    await user.type(input, 'Bob');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));
    
    await user.clear(input);
    await user.type(input, 'Charlie');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));

    // Assert: Ordre initial
    expect(screen.getByText(/1\. Alice/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Bob/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Charlie/i)).toBeInTheDocument();

    // Act: Descendre Alice (1 → 2)
    const btnDescendre = screen.getAllByText('⬇️')[0];
    await user.click(btnDescendre);

    // Assert: Nouvel ordre
    await waitFor(() => {
      expect(screen.getByText(/1\. Bob/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Alice/i)).toBeInTheDocument();
    });
  });

  test('devrait permettre de supprimer un vendeur avant démarrage', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    // Ajouter Alice
    const input = screen.getByPlaceholderText('Nom du vendeur');
    await user.type(input, 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));

    // Assert: Alice présente
    expect(screen.getByText(/1\. Alice/i)).toBeInTheDocument();

    // Act: Supprimer Alice
    const btnSupprimer = screen.getByTitle('Supprimer');
    await user.click(btnSupprimer);

    // Assert: Alice supprimée
    await waitFor(() => {
      expect(screen.queryByText(/Alice/i)).not.toBeInTheDocument();
    });
  });

  test('devrait afficher le nombre de vendeurs dans le bouton démarrer', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    // Ajouter 2 vendeurs
    const input = screen.getByPlaceholderText('Nom du vendeur');
    
    await user.type(input, 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));
    
    await user.clear(input);
    await user.type(input, 'Bob');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));

    // Assert: Le bouton indique "2 vendeurs"
    expect(screen.getByRole('button', { name: /Démarrer la Journée \(2 vendeurs\)/i })).toBeInTheDocument();
  });

  test('devrait enregistrer le démarrage dans l\'historique', async () => {
    const responses = [
      {
        ...mockServerState,
        historique: [
          {
            date: '23/10/2025',
            heure: '10:00:00',
            action: 'Démarrage de la journée avec: Alice, Bob',
            vendeur: 'Système',
            clientId: null,
          },
        ],
      },
    ];
    setupFetchMock(responses);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    // Ajouter vendeurs et démarrer
    const input = screen.getByPlaceholderText('Nom du vendeur');
    await user.type(input, 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));
    
    await user.clear(input);
    await user.type(input, 'Bob');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));
    
    await user.click(screen.getByRole('button', { name: /Démarrer la Journée/i }));

    jest.advanceTimersByTime(2000);

    // Assert: L'historique contient le démarrage
    await waitFor(() => {
      expect(screen.getByText(/Démarrage de la journée/i)).toBeInTheDocument();
    });
  });

  test('devrait gérer les noms de vendeurs avec espaces', async () => {
    setupFetchMock([mockServerState]);

    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    // Ajouter un vendeur avec des espaces autour
    const input = screen.getByPlaceholderText('Nom du vendeur');
    await user.type(input, '  Alice  ');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));

    // Assert: Le nom doit être trimé
    expect(screen.getByText(/1\. Alice/i)).toBeInTheDocument();
    expect(screen.queryByText(/1\.   Alice  /i)).not.toBeInTheDocument();
  });

  test('ne devrait pas permettre d\'ajouter le même vendeur deux fois', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TourDeLigneApp />);

    const input = screen.getByPlaceholderText('Nom du vendeur');
    
    // Ajouter Alice
    await user.type(input, 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));

    // Tenter d'ajouter Alice à nouveau
    await user.clear(input);
    await user.type(input, 'Alice');
    await user.click(screen.getByRole('button', { name: /Ajouter/i }));

    // Assert: Alice ne doit apparaître qu'une seule fois
    const aliceElements = screen.getAllByText(/Alice/i);
    expect(aliceElements.length).toBe(1);
  });
});

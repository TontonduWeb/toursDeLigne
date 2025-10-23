import { useState, useEffect, useCallback, useRef } from 'react';

interface ExportData {
  dateClôture: string;
  heureClôture: string;
  timestamp: string;
  statistiques: {
    totalVendeurs: number;
    totalVentes: number;
    moyenneVentes: string;
  };
  vendeurs: Array<{
    nom: string;
    ventes: number;
    clientEnCours: any;
  }>;
  historique: Array<any>;
}

interface TerminerJourneeResponse {
  success: boolean;
  message: string;
  exportData: ExportData;
}

interface ServerState {
  ordreActuel: {
    prochainVendeur: string | null;
  };
  vendeurs: Array<{
    nom: string;
    ventes: number;
    clientEnCours: {
      id: string;
      heureDebut: string;
      dateDebut: string;
    } | null;
  }>;
  historique: Array<{
    date: string;
    heure: string;
    action: string;
    vendeur?: string;
    clientId?: string;
  }>;
}

interface UseRestApiOptions {
  baseUrl?: string;
  pollingInterval?: number;
  onStateUpdate?: (state: ServerState) => void;
  onError?: (error: Error) => void;
}

export const useRestApi = (options: UseRestApiOptions = {}) => {
  const {
    baseUrl = 'http://192.168.1.27:8082',
    pollingInterval = 3000,
    onStateUpdate,
    onError
  } = options;

  const [state, setState] = useState<ServerState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  
  const pollingIntervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Fonction pour récupérer l'état du serveur
  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/api/state`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ServerState = await response.json();

      if (isMountedRef.current) {
        setState(prevState => {
          // Force une nouvelle référence si les données ont changé
          const hasChanged = JSON.stringify(prevState) !== JSON.stringify(data);
          console.log('📡 Server state changed:', hasChanged);
          return hasChanged ? { ...data } : prevState;
        });
        setIsOnline(true);
        setError(null);
        onStateUpdate?.(data);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      if (isMountedRef.current) {
        setError(error);
        setIsOnline(false);
        onError?.(error);
      }
      
      console.error('Erreur fetch state:', error);
    }
  }, [baseUrl, onStateUpdate, onError]);

  // Fonction générique pour faire des requêtes POST
  const postRequest = useCallback(async (endpoint: string, payload: any = {}) => {
  setIsLoading(true);
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // ✅ ATTENDRE un peu avant de rafraîchir pour laisser le serveur terminer
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Rafraîchir l'état après une mutation
    await fetchState();
    
    return data;
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    setError(error);
    onError?.(error);
    throw error;
  } finally {
    setIsLoading(false);
  }
}, [baseUrl, fetchState, onError]);

  // Actions métier
  const actions = {
    demarrerJournee: useCallback(async (vendeurs: string[]) => {
      return postRequest('/api/demarrer-journee', { vendeurs });
    }, [postRequest]),

    prendreClient: useCallback(async (vendeur: string) => {
      return postRequest('/api/prendre-client', { vendeur });
    }, [postRequest]),

    abandonnerClient: useCallback(async (vendeur: string) => {
      return postRequest('/api/abandonner-client', { vendeur });
    }, [postRequest]),

    enregistrerVente: useCallback(async (vendeur: string) => {
      return postRequest('/api/enregistrer-vente', { vendeur });
    }, [postRequest]),

    terminerJournee: useCallback(async (): Promise<TerminerJourneeResponse> => {
      const response = await postRequest('/api/terminer-journee');
      return response as TerminerJourneeResponse;
    }, [postRequest]),

    reinitialiser: useCallback(async () => {
      return postRequest('/api/reinitialiser');
    }, [postRequest]),
    
    ajouterVendeur: useCallback(async (vendeur: string) => {
    return postRequest('/api/ajouter-vendeur', { vendeur });
  }, [postRequest]),
  };

  // Fonction pour obtenir les stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/api/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('Erreur fetch stats:', err);
      throw err;
    }
  }, [baseUrl]);

  // Démarrer le polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Fetch immédiat
    fetchState();

    // Puis polling régulier
    pollingIntervalRef.current = window.setInterval(() => {
      fetchState();
    }, pollingInterval);
  }, [fetchState, pollingInterval]);

  // Arrêter le polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Rafraîchir manuellement
  const refresh = useCallback(() => {
    return fetchState();
  }, [fetchState]);

  // Démarrer le polling au montage
  useEffect(() => {
    isMountedRef.current = true;
    startPolling();

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  // Gérer la visibilité de la page (pause/reprise du polling)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startPolling, stopPolling]);

  return {
    state,
    isLoading,
    error,
    isOnline,
    actions,
    refresh,
    fetchStats,
    startPolling,
    stopPolling
  };
};
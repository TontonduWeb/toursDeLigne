// src/components/TourDeLigneApp.tsx
import React, { useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useWebSocketSync } from '../hooks/useWebSocketSync';
import { HistoriqueItem, VendeurData, ClientEnCours } from '../types';
import ConfigurationVendeurs from './ConfigurationVendeurs';
import GestionOrdre from './GestionOrdre';
import GestionClients from './GestionClients'; // Nouveau composant
import EnregistrementVentes from './EnregistrementVentes';
import HistoriqueVentes from './HistoriqueVentes';
import ActionButtons from './ActionButtons';
import { trierOrdreVendeurs } from '../services/vendeurService';
import { getAdjustedDateString, getAdjustedDate } from '../utils/dateUtils';

const TourDeLigneApp: React.FC = () => {
  // États avec localStorage (gardés pour la persistance locale)
  const [vendeurs, setVendeurs] = useLocalStorage<string[]>('vendeurs', []);
  const [ordreInitial, setOrdreInitial] = useLocalStorage<string[]>('ordreInitial', []);
  const [ordre, setOrdre] = useLocalStorage<string[]>('ordre', []);
  const [historique, setHistorique] = useLocalStorage<HistoriqueItem[]>('historique', []);
  const [journeeActive, setJourneeActive] = useLocalStorage<boolean>('journeeActive', false);
  const [vendeursData, setVendeursData] = useLocalStorage<Record<string, VendeurData>>('vendeursData', {});

  // Connexion WebSocket
  const {
    sendMessage,
    subscribe,
    unsubscribe,
    isConnected,
    connectionStatus,
    readyState
  } = useWebSocketSync('ws://192.168.1.27:8082', {
    onOpen: () => {
      console.log('WebSocket connecté !');
      sendMessage({ type: 'GET_INITIAL_STATE' });
    },
    onClose: () => {
      console.log('WebSocket fermé');
    },
    onError: (error) => {
      console.error('Erreur WebSocket:', error);
    }
  });

  // S'abonner aux mises à jour du serveur
  useEffect(() => {
    const handleStateUpdate = (serverState: any) => {
      console.log('Mise à jour serveur reçue:', serverState);
      
      let nouveauxVendeurs = vendeurs;
      let nouvellesVendeursData = vendeursData;
      
      if (serverState.vendeurs) {
        const vendeurNames = serverState.vendeurs.map((v: any) => v.nom);
        nouveauxVendeurs = vendeurNames;
        setVendeurs(vendeurNames);
        
        const vendeursDataLocal: Record<string, VendeurData> = {};
        serverState.vendeurs.forEach((v: any) => {
          vendeursDataLocal[v.nom] = {
            nom: v.nom,
            compteurVentes: v.ventes,
            clientEnCours: v.clientEnCours || undefined // Nouveau: synchronisation du client en cours
          };
        });
        nouvellesVendeursData = vendeursDataLocal;
        setVendeursData(vendeursDataLocal);
      }

      if (serverState.ordreActuel?.prochainVendeur) {
        const nouveauOrdre = trierOrdreVendeurs(
          nouveauxVendeurs, 
          ordre, 
          nouvellesVendeursData
        );
        setOrdre(nouveauOrdre);
      }

      if (serverState.historique) {
        const historiqueLocal: HistoriqueItem[] = serverState.historique.map((h: any) => ({
          action: h.action.includes('Vente') ? 'vente' : 
                 h.action.includes('Client pris') ? 'prise_client' :
                 h.action.includes('Client abandonné') ? 'abandon_client' : 'autre',
          vendeur: h.vendeur || undefined,
          clientId: h.clientId || undefined, // Nouveau
          date: h.date,
          heure: h.heure,
          message: h.action,
          nouvelOrdre: undefined
        }));
        setHistorique(historiqueLocal);
      }
    };

    subscribe('STATE_UPDATE', handleStateUpdate);

    return () => {
      unsubscribe('STATE_UPDATE');
    };
  }, [subscribe, unsubscribe, vendeurs, ordre, vendeursData, setVendeurs, setVendeursData, setOrdre, setHistorique]);

  // Mettre à jour l'ordre selon les règles métier
  useEffect(() => {
    if (journeeActive && ordreInitial.length > 0) {
      const nouvelOrdre = trierOrdreVendeurs(ordreInitial, ordre, vendeursData);
      if (JSON.stringify(nouvelOrdre) !== JSON.stringify(ordre)) {
        setOrdre(nouvelOrdre);
      }
    }
  }, [vendeursData, journeeActive, ordreInitial, ordre, setOrdre]);

  // Fonctions de gestion des vendeurs (inchangées)
  const ajouterVendeur = (vendeur: string): void => {
    if (!vendeurs.includes(vendeur)) {
      const updatedVendeurs = [...vendeurs, vendeur];
      setVendeurs(updatedVendeurs);
      
      const newVendeurData = {
        nom: vendeur,
        compteurVentes: 0,
        clientEnCours: undefined // Nouveau: pas de client au départ
      };
      
      setVendeursData(prev => ({
        ...prev,
        [vendeur]: newVendeurData
      }));

      if (isConnected) {
        sendMessage({
          type: 'SYNC_VENDEURS',
          payload: { vendeurs: updatedVendeurs }
        });
      }
    }
  };

  const supprimerVendeur = (vendeur: string): void => {
    setVendeurs(vendeurs.filter(v => v !== vendeur));
    if (journeeActive) {
      setOrdre(ordre.filter(v => v !== vendeur));
      setOrdreInitial(ordreInitial.filter(v => v !== vendeur));
    }
    
    const updatedVendeursData = {...vendeursData};
    delete updatedVendeursData[vendeur];
    setVendeursData(updatedVendeursData);

    if (isConnected) {
      sendMessage({
        type: 'SYNC_VENDEURS',
        payload: { vendeurs: vendeurs.filter(v => v !== vendeur) }
      });
    }
  };

  // Fonctions de gestion de la journée (inchangées)
  const demarrerJournee = (): void => {
    if (vendeurs.length === 0) {
      alert("Veuillez ajouter au moins un vendeur avant de démarrer la journée.");
      return;
    }
    
    const initialOrdre = [...vendeurs];
    setOrdreInitial(initialOrdre);
    setOrdre(initialOrdre);
    setJourneeActive(true);
    
    const nouveauVendeursData: Record<string, VendeurData> = {};
    vendeurs.forEach(vendeur => {
      nouveauVendeursData[vendeur] = {
        nom: vendeur,
        compteurVentes: 0,
        clientEnCours: undefined // Nouveau: pas de client au départ
      };
    });
    setVendeursData(nouveauVendeursData);
    
    const maintenant = new Date();
    const nouvelHistorique = [
      ...historique, 
      {
        action: 'demarrage' as const,
        date: maintenant.toLocaleDateString(),
        heure: maintenant.toLocaleTimeString(),
        message: `Démarrage de la journée avec l'ordre: ${vendeurs.join(', ')}`
      }
    ];
    setHistorique(nouvelHistorique);

    if (isConnected) {
      sendMessage({
        type: 'DEMARRER_JOURNEE',
        payload: { vendeurs: initialOrdre }
      });
    }
  };

  const terminerJournee = (): void => {
    if (window.confirm('Êtes-vous sûr de vouloir terminer la journée ? L\'ordre sera réinitialisé.')) {
      if (isConnected) {
        sendMessage({ type: 'TERMINER_JOURNEE' });
      }

      const maintenant = new Date();
      setHistorique([
        ...historique, 
        {
          action: 'fin' as const,
          date: getAdjustedDateString(),
          heure: getAdjustedDate().toLocaleTimeString('fr-FR'),
          message: `Fin de la journée`
        }
      ]);
      
      setJourneeActive(false);
      setOrdre([]);
      setOrdreInitial([]);
    }
  };

  // NOUVELLES FONCTIONS: Gestion des clients
  const prendreClient = (vendeur: string): void => {
    if (!journeeActive || !ordre.includes(vendeur) || vendeursData[vendeur]?.clientEnCours) return;
    
    const maintenant = getAdjustedDate();
    const clientId = `client-${Date.now()}`;
    const nouveauClient: ClientEnCours = {
      id: clientId,
      heureDebut: maintenant.toLocaleTimeString('fr-FR'),
      dateDebut: getAdjustedDateString()
    };

    // Mettre à jour les données du vendeur
    setVendeursData(prev => ({
      ...prev,
      [vendeur]: {
        ...prev[vendeur],
        clientEnCours: nouveauClient
      }
    }));

    // Ajouter à l'historique
    setHistorique(prev => [
      ...prev,
      {
        action: 'prise_client' as const,
        vendeur,
        clientId,
        date: getAdjustedDateString(),
        heure: maintenant.toLocaleTimeString('fr-FR'),
        message: `${vendeur} a pris un client en charge`
      }
    ]);

    // Synchroniser avec le serveur
    if (isConnected) {
      sendMessage({
        type: 'PRENDRE_CLIENT',
        payload: { vendeur, clientId }
      });
    }
  };

  const abandonnerClient = (vendeur: string): void => {
    if (!journeeActive || !vendeursData[vendeur]?.clientEnCours) return;

    const clientId = vendeursData[vendeur]?.clientEnCours?.id;

    // Retirer le client du vendeur
    setVendeursData(prev => ({
      ...prev,
      [vendeur]: {
        ...prev[vendeur],
        clientEnCours: undefined
      }
    }));

    // Ajouter à l'historique
    const maintenant = getAdjustedDate();
    setHistorique(prev => [
      ...prev,
      {
        action: 'abandon_client' as const,
        vendeur,
        clientId,
        date: getAdjustedDateString(),
        heure: maintenant.toLocaleTimeString('fr-FR'),
        message: `${vendeur} a abandonné son client`
      }
    ]);

    // Synchroniser avec le serveur
    if (isConnected) {
      sendMessage({
        type: 'ABANDONNER_CLIENT',
        payload: { vendeur, clientId }
      });
    }
  };

  // FONCTION MODIFIÉE: Enregistrement des ventes
  const enregistrerVente = (vendeur: string): void => {
    if (!journeeActive || !ordre.includes(vendeur) || !vendeursData[vendeur]?.clientEnCours) return;
    
    const clientId = vendeursData[vendeur]?.clientEnCours?.id;

    if (isConnected) {
      sendMessage({
        type: 'ENREGISTRER_VENTE',
        payload: { vendeur, clientId }
      });
    } else {
      // Fallback local
      setVendeursData(prev => ({
        ...prev,
        [vendeur]: {
          ...(prev[vendeur] || { nom: vendeur }),
          compteurVentes: (prev[vendeur]?.compteurVentes || 0) + 1,
          clientEnCours: undefined // Libérer le vendeur
        }
      }));
      
      setTimeout(() => {
        const maintenant = new Date();
        setHistorique(prev => [
          ...prev, 
          {
            action: 'vente' as const,
            vendeur,
            clientId,
            date: getAdjustedDateString(),
            heure: getAdjustedDate().toLocaleTimeString('fr-FR'),
            nouvelOrdre: ordre.join(', '),
            message: `${vendeur} a finalisé une vente`
          }
        ]);
      }, 0);
    }
  };

  // Fonctions utilitaires (inchangées)
  const reinitialiserTout = (): void => {
    if (window.confirm('Êtes-vous sûr de vouloir tout réinitialiser ? Tous les vendeurs et l\'historique seront supprimés.')) {
      setVendeurs([]);
      setOrdre([]);
      setOrdreInitial([]);
      setHistorique([]);
      setJourneeActive(false);
      setVendeursData({});
      
      localStorage.clear();
      
      if (isConnected) {
        sendMessage({ type: 'REINITIALISER_TOUT' });
      }
    }
  };

  const exporterDonnees = (): void => {
    const donnees = {
      vendeurs,
      ordreInitial,
      ordre,
      historique,
      journeeActive,
      vendeursData,
      connectionStatus,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tour-de-ligne-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = () => {
    switch (readyState) {
      case WebSocket.CONNECTING: return 'text-yellow-600';
      case WebSocket.OPEN: return 'text-green-600';
      case WebSocket.CLOSING: return 'text-orange-600';
      case WebSocket.CLOSED: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Gestion du Tour de Ligne</h1>
      
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-center">
          <span className="font-medium mr-2">Synchronisation: </span>
          <span className={`font-semibold ${getStatusColor()}`}>
            {connectionStatus}
          </span>
          {!isConnected && (
            <span className="ml-2 text-sm text-orange-600">
              (Mode hors ligne - données locales uniquement)
            </span>
          )}
        </div>
      </div>
      
      {!journeeActive ? (
        <ConfigurationVendeurs 
          vendeurs={vendeurs}
          onAjouterVendeur={ajouterVendeur}
          onSupprimerVendeur={supprimerVendeur}
          onDemarrerJournee={demarrerJournee}
        />
      ) : (
        <>
          <GestionOrdre 
            ordre={ordre}
            ordreInitial={ordreInitial}
            vendeursData={vendeursData}
            onTerminerJournee={terminerJournee}
          />
          
          {/* NOUVEAU: Composant de gestion des clients */}
          <GestionClients
            ordre={ordre}
            vendeursData={vendeursData}
            onPrendreClient={prendreClient}
            onAbandonnerClient={abandonnerClient}
          />
          
          <EnregistrementVentes 
            ordre={ordre}
            vendeursData={vendeursData}
            onEnregistrerVente={enregistrerVente}
          />
        </>
      )}
      
      <HistoriqueVentes historique={historique} />
      
      <ActionButtons 
        onExporterDonnees={exporterDonnees}
        onReinitialiserTout={reinitialiserTout}
      />

      {!isConnected && (
        <div className="fixed bottom-4 right-4 bg-orange-500 text-white p-4 rounded-lg shadow-lg max-w-xs">
          <p className="font-medium">⚠️ Mode hors ligne</p>
          <p className="text-sm">Les modifications ne seront synchronisées qu'à la reconnexion</p>
        </div>
      )}
    </div>
  );
};

export default TourDeLigneApp;
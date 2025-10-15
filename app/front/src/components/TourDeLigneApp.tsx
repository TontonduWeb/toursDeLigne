import React, { useEffect, useState } from 'react';
import { useRestApi } from '../hooks/useRestApi';
import { HistoriqueItem, VendeurData } from '../types';
import ConfigurationVendeurs from './ConfigurationVendeurs';
import AjoutVendeurJournee from './AjoutVendeurJournee';
import GestionOrdre from './GestionOrdre';
import GestionClients from './GestionClients';
import EnregistrementVentes from './EnregistrementVentes';
import HistoriqueVentes from './HistoriqueVentes';
import ActionButtons from './ActionButtons';
import { trierOrdreVendeurs } from '../services/vendeurService';

const TourDeLigneApp: React.FC = () => {
  // États synchronisés avec le serveur (plus de localStorage)
  const [vendeurs, setVendeurs] = useState<string[]>([]);
  const [journeeActive, setJourneeActive] = useState<boolean>(false);
  const [ordreInitial, setOrdreInitial] = useState<string[]>([]);
  const [ordre, setOrdre] = useState<string[]>([]);
  const [historique, setHistorique] = useState<HistoriqueItem[]>([]);
  const [vendeursData, setVendeursData] = useState<Record<string, VendeurData>>({});

  // Hook REST API avec polling
  const { state, isLoading, error, isOnline, actions, refresh } = useRestApi({
    baseUrl: process.env.REACT_APP_API_URL || 'http://192.168.1.27:8082',
    pollingInterval: 10000,
    onStateUpdate: (serverState) => {
      console.log('🔥 État serveur reçu:', serverState);
      
      // Mettre à jour UNIQUEMENT si le serveur a des vendeurs (journée démarrée côté serveur)
      if (serverState.vendeurs && serverState.vendeurs.length > 0) {
        const vendeurNames = serverState.vendeurs.map(v => v.nom);
        setVendeurs(vendeurNames);
        setJourneeActive(true);
        
        // Convertir en format local
        const vendeursDataLocal: Record<string, VendeurData> = {};
        serverState.vendeurs.forEach(v => {
          vendeursDataLocal[v.nom] = {
            nom: v.nom,
            compteurVentes: v.ventes,
            clientEnCours: v.clientEnCours || undefined
          };
        });
        setVendeursData(vendeursDataLocal);
        
        // Mettre à jour l'ordre
        const nouveauOrdre = trierOrdreVendeurs(
          vendeurNames,
          vendeurNames,
          vendeursDataLocal
        );
        
        setOrdre(nouveauOrdre);
        setOrdreInitial(vendeurNames);
      }
      
      // Mettre à jour l'historique (toujours, même sans vendeurs)
      if (serverState.historique) {
        const historiqueLocal: HistoriqueItem[] = serverState.historique.map(h => ({
          action: h.action.includes('Vente') ? 'vente' :
                 h.action.includes('Client pris') ? 'prise_client' :
                 h.action.includes('Client abandonné') ? 'abandon_client' :
                 h.action.includes('Démarrage') ? 'demarrage' :
                 h.action.includes('terminée') ? 'fin' : 'autre',
          vendeur: h.vendeur,
          clientId: h.clientId,
          date: h.date,
          heure: h.heure,
          message: h.action
        }));
        setHistorique(historiqueLocal);
      }
    },
    onError: (err) => {
      console.error('❌ Erreur API:', err);
    }
  });

  // Recalculer l'ordre quand vendeursData change
  useEffect(() => {
    if (journeeActive && ordreInitial.length > 0) {
      const nouvelOrdre = trierOrdreVendeurs(ordreInitial, ordre, vendeursData);
      if (JSON.stringify(nouvelOrdre) !== JSON.stringify(ordre)) {
        setOrdre(nouvelOrdre);
      }
    }
  }, [vendeursData, journeeActive, ordreInitial]);

  // ==================== ACTIONS ====================

  const ajouterVendeur = (vendeur: string): void => {
    if (!vendeurs.includes(vendeur)) {
      setVendeurs([...vendeurs, vendeur]);
    }
  };

  const supprimerVendeur = (vendeur: string): void => {
    setVendeurs(vendeurs.filter(v => v !== vendeur));
  };

  // NOUVEAU : Monter un vendeur dans l'ordre
  const monterVendeur = (index: number): void => {
    if (index > 0) {
      const nouveauVendeurs = [...vendeurs];
      [nouveauVendeurs[index - 1], nouveauVendeurs[index]] = 
      [nouveauVendeurs[index], nouveauVendeurs[index - 1]];
      setVendeurs(nouveauVendeurs);
    }
  };

  // NOUVEAU : Descendre un vendeur dans l'ordre
  const descendreVendeur = (index: number): void => {
    if (index < vendeurs.length - 1) {
      const nouveauVendeurs = [...vendeurs];
      [nouveauVendeurs[index], nouveauVendeurs[index + 1]] = 
      [nouveauVendeurs[index + 1], nouveauVendeurs[index]];
      setVendeurs(nouveauVendeurs);
    }
  };

  const demarrerJournee = async (): Promise<void> => {
    if (vendeurs.length === 0) {
      alert("Veuillez ajouter au moins un vendeur avant de démarrer la journée.");
      return;
    }

    try {
      await actions.demarrerJournee(vendeurs);
      // L'état sera mis à jour automatiquement via le polling
    } catch (err) {
      alert('Erreur lors du démarrage de la journée');
      console.error(err);
    }
  };

  const terminerJournee = async (): Promise<void> => {
    if (window.confirm('Êtes-vous sûr de vouloir terminer la journée ? L\'ordre sera réinitialisé.')) {
      try {
        await actions.terminerJournee();
        // L'état sera mis à jour automatiquement via le polling
      } catch (err) {
        alert('Erreur lors de la fin de journée');
        console.error(err);
      }
    }
  };

  const prendreClient = async (vendeur: string): Promise<void> => {
    if (!journeeActive || !ordre.includes(vendeur) || vendeursData[vendeur]?.clientEnCours) {
      return;
    }

    try {
      await actions.prendreClient(vendeur);
    } catch (err) {
      alert('Erreur lors de la prise en charge du client');
      console.error(err);
    }
  };

  const abandonnerClient = async (vendeur: string): Promise<void> => {
    if (!journeeActive || !vendeursData[vendeur]?.clientEnCours) {
      return;
    }

    try {
      await actions.abandonnerClient(vendeur);
    } catch (err) {
      alert('Erreur lors de l\'abandon du client');
      console.error(err);
    }
  };

  const enregistrerVente = async (vendeur: string): Promise<void> => {
    if (!journeeActive || !ordre.includes(vendeur) || !vendeursData[vendeur]?.clientEnCours) {
      return;
    }

    try {
      await actions.enregistrerVente(vendeur);
    } catch (err) {
      alert('Erreur lors de l\'enregistrement de la vente');
      console.error(err);
    }
  };

  const reinitialiserTout = async (): Promise<void> => {
    if (window.confirm('Êtes-vous sûr de vouloir tout réinitialiser ? Tous les vendeurs et l\'historique seront supprimés.')) {
      try {
        await actions.reinitialiser();
        // L'état sera mis à jour automatiquement via le polling
      } catch (err) {
        alert('Erreur lors de la réinitialisation');
        console.error(err);
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
      isOnline,
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
    if (isLoading) return 'text-blue-600';
    if (!isOnline) return 'text-red-600';
    return 'text-green-600';
  };

  const getStatusText = () => {
    if (isLoading) return 'Chargement...';
    if (!isOnline) return 'Hors ligne';
    return 'En ligne';
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Gestion du Tour de Ligne</h1>
      
      {/* Indicateur de statut */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-center">
          <span className="font-medium mr-2">Synchronisation: </span>
          <span className={`font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          {!isOnline && (
            <span className="ml-2 text-sm text-orange-600">
              (Mode hors ligne - Reconnexion automatique...)
            </span>
          )}
          <button
            onClick={refresh}
            className="ml-4 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            disabled={isLoading}
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Afficher les erreurs */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">⚠️ Erreur de connexion</p>
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      )}
      
      {!journeeActive ? (
        <ConfigurationVendeurs 
          vendeurs={vendeurs}
          onAjouterVendeur={ajouterVendeur}
          onSupprimerVendeur={supprimerVendeur}
          onMonterVendeur={monterVendeur}
          onDescendreVendeur={descendreVendeur}
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

      {/* Notification en bas pour mode hors ligne */}
      {!isOnline && (
        <div className="fixed bottom-4 right-4 bg-orange-500 text-white p-4 rounded-lg shadow-lg max-w-xs">
          <p className="font-medium">⚠️ Mode hors ligne</p>
          <p className="text-sm">Tentative de reconnexion automatique...</p>
        </div>
      )}

      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm">⏳ Synchronisation...</p>
        </div>
      )}
    </div>
  );
};

export default TourDeLigneApp;
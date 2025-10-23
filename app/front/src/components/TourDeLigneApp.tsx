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
import RecapitulatifJournee from './RecapitulatifJournee';

const TourDeLigneApp: React.FC = () => {
  // États synchronisés avec le serveur (plus de localStorage)
  const [vendeurs, setVendeurs] = useState<string[]>([]);
  const [journeeActive, setJourneeActive] = useState<boolean>(false);
  const [ordreInitial, setOrdreInitial] = useState<string[]>([]);
  const [ordre, setOrdre] = useState<string[]>([]);
  const [historique, setHistorique] = useState<HistoriqueItem[]>([]);
  const [vendeursData, setVendeursData] = useState<Record<string, VendeurData>>({});
  const [recapitulatifJournee, setRecapitulatifJournee] = useState<any>(null);
  const [afficherRecapitulatif, setAfficherRecapitulatif] = useState<boolean>(false);

  // Hook REST API avec polling
  const { state, isLoading, error, isOnline, actions, refresh } = useRestApi({
    baseUrl: process.env.REACT_APP_API_URL || 'http://192.168.1.27:8082',
    pollingInterval: 3000,
    onStateUpdate: (serverState) => {
  console.log('🔥 État serveur reçu:', serverState);
  
  if (serverState.vendeurs && serverState.vendeurs.length > 0) {
    const tousAZero = serverState.vendeurs.every(v => v.ventes === 0 && !v.clientEnCours);
    
    if (tousAZero && journeeActive) {
      console.log('⚠️ Journée terminée détectée - pas de réactivation');
      return;
    }
    
    const vendeurNames = serverState.vendeurs.map(v => v.nom);
    setVendeurs(vendeurNames);
    setJourneeActive(true);
    
    // ✅ Convertir en format local avec logs
    const vendeursDataLocal: Record<string, VendeurData> = {};
    serverState.vendeurs.forEach(v => {
      vendeursDataLocal[v.nom] = {
        nom: v.nom,
        compteurVentes: v.ventes,
        clientEnCours: v.clientEnCours || undefined
      };
      console.log(`Vendeur ${v.nom}:`, v.ventes, 'ventes, client:', !!v.clientEnCours);
    });
    
    setVendeursData(prev => {
      // Force React à détecter le changement en comparant le contenu
      const hasChanged = JSON.stringify(prev) !== JSON.stringify(vendeursDataLocal);
      console.log('🔄 VendeursData changed:', hasChanged);
      return hasChanged ? { ...vendeursDataLocal } : prev;
    });
    
    // Mettre à jour l'ordre
    const nouveauOrdre = trierOrdreVendeurs(
      vendeurNames,
      vendeurNames,
      vendeursDataLocal
    );
    
    setOrdre(nouveauOrdre);
    setOrdreInitial(vendeurNames);
  } else if (!journeeActive) {
    // Pas de vendeurs côté serveur ET journée non active = OK
    // Ne rien faire
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
}
  });

  // Recalculer l'ordre quand vendeursData change
  useEffect(() => {
    if (journeeActive && ordreInitial.length > 0) {
      const nouvelOrdre = trierOrdreVendeurs(ordreInitial, ordre, vendeursData);
      if (JSON.stringify(nouvelOrdre) !== JSON.stringify(ordre)) {
        console.log('🔄 Ordre mis à jour:', nouvelOrdre);
        setOrdre(nouvelOrdre);
      }
    }
  }, [vendeursData, journeeActive, ordreInitial, ordre]);

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
  const confirmation = window.confirm(
    '⚠️ ATTENTION - Action irréversible\n\n' +
    'Êtes-vous sûr de vouloir CLÔTURER la journée ?\n\n' +
    '✓ Un export automatique sera généré\n' +
    '✓ Les compteurs seront remis à zéro\n' +
    '✓ L\'ordre sera réinitialisé\n' +
    '✓ L\'historique sera effacé\n' +
    '✓ Vous ne pourrez plus enregistrer de ventes pour cette journée\n\n' +
    'Pour continuer, cliquez sur OK.'
  );

  if (!confirmation) return;

  try {
    const result = await actions.terminerJournee();

    if (result.success && result.exportData) {
      // Télécharger automatiquement l'export
      const blob = new Blob([JSON.stringify(result.exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloture-journee-${result.exportData.dateClôture.replace(/\//g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Afficher le récapitulatif
      setRecapitulatifJournee(result.exportData);
      setAfficherRecapitulatif(true);

      // Réinitialiser l'état de l'application
      setJourneeActive(false);
      setOrdre([]);
      setOrdreInitial([]);
      setVendeursData({});
      setVendeurs([]);  // ✅ Vider aussi la liste des vendeurs
      setHistorique([]); // ✅ Vider l'historique local

      // Message de succès
      alert(
        '✅ Journée clôturée avec succès !\n\n' +
        `📊 Total des ventes : ${result.exportData.statistiques.totalVentes}\n` +
        `👥 Nombre de vendeurs : ${result.exportData.statistiques.totalVendeurs}\n` +
        `📈 Moyenne par vendeur : ${result.exportData.statistiques.moyenneVentes}\n\n` +
        '💾 L\'export a été téléchargé automatiquement.\n' +
        '🗑️ L\'historique a été effacé.\n\n' +
        '🔄 Vous pouvez maintenant redémarrer une nouvelle journée.'
      );
    }
  } catch (err) {
    alert('❌ Erreur lors de la clôture de la journée');
    console.error(err);
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
  // ✅ Vérifier l'état ACTUEL du vendeur avant d'agir
  const vendeurActuel = vendeursData[vendeur];
  
  if (!journeeActive) {
    console.warn('Journée non active');
    return;
  }
  
  if (!vendeurActuel) {
    console.warn('Vendeur introuvable:', vendeur);
    alert('Erreur: Vendeur introuvable');
    return;
  }
  
  if (!vendeurActuel.clientEnCours) {
    console.warn('Aucun client en cours pour:', vendeur);
    alert('Ce vendeur n\'a pas de client en cours');
    return;
  }

  try {
    console.log('Abandon client pour:', vendeur, vendeurActuel.clientEnCours);
    await actions.abandonnerClient(vendeur);
    
    // ✅ Forcer un refresh immédiat
    await refresh();
  } catch (err) {
    console.error('Erreur abandon:', err);
    alert(`Erreur lors de l'abandon du client: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
  }
};

  const enregistrerVente = async (vendeur: string): Promise<void> => {
  const vendeurActuel = vendeursData[vendeur];
  
  if (!journeeActive) {
    console.warn('Journée non active');
    return;
  }
  
  if (!vendeurActuel) {
    console.warn('Vendeur introuvable:', vendeur);
    alert('Erreur: Vendeur introuvable');
    return;
  }
  
  if (!vendeurActuel.clientEnCours) {
    console.warn('Aucun client en cours pour:', vendeur);
    alert('Ce vendeur n\'a pas de client en cours');
    return;
  }

  try {
    console.log('Enregistrement vente pour:', vendeur, vendeurActuel.clientEnCours);
    await actions.enregistrerVente(vendeur);
    
    // ✅ Forcer un refresh immédiat
    await refresh();
  } catch (err) {
    console.error('Erreur vente:', err);
    alert(`Erreur lors de l'enregistrement de la vente: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
  }
};
  const ajouterVendeurEnCoursDeJournee = async (vendeur: string): Promise<void> => {
  try {
    await actions.ajouterVendeur(vendeur);
    // L'état sera mis à jour automatiquement via le polling
  } catch (err) {
    alert('Erreur lors de l\'ajout du vendeur');
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
    {/* Ajout de vendeur en cours de journée */}
    <AjoutVendeurJournee 
      vendeursExistants={vendeurs}
      onAjouterVendeur={ajouterVendeurEnCoursDeJournee}
    />
    
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
      {/* Récapitulatif de journée */}
      {afficherRecapitulatif && recapitulatifJournee && (
        <RecapitulatifJournee
          exportData={recapitulatifJournee}
          onFermer={() => {
            setAfficherRecapitulatif(false);
            setRecapitulatifJournee(null);
          }}
  />
)}
    </div>
  );
};
export default TourDeLigneApp;
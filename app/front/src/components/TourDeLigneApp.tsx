import React, { useState } from 'react';
import { useRestApi } from '../hooks/useRestApi';
import { VendeurData } from '../types';
import ConfigurationVendeurs from './ConfigurationVendeurs';
import AjoutVendeurJournee from './AjoutVendeurJournee';
import GestionOrdre from './GestionOrdre';
import GestionClients from './GestionClients';
import EnregistrementVentes from './EnregistrementVentes';
import HistoriqueVentes from './HistoriqueVentes';
import ActionButtons from './ActionButtons';
import RecapitulatifJournee from './RecapitulatifJournee';

const TourDeLigneApp: React.FC = () => {
  // ========== ÉTATS LOCAUX (uniquement ce qui n'est PAS sur le serveur) ==========
  
  // Configuration avant démarrage (pas encore envoyée au serveur)
  const [vendeursConfig, setVendeursConfig] = useState<string[]>([]);
  
  // Récapitulatif après clôture
  const [recapitulatifJournee, setRecapitulatifJournee] = useState<any>(null);
  const [afficherRecapitulatif, setAfficherRecapitulatif] = useState<boolean>(false);

  // ========== HOOK REST API (source unique de vérité) ==========
  const { state, isLoading, error, isOnline, actions, refresh } = useRestApi({
    baseUrl: process.env.REACT_APP_API_URL || 'http://192.168.1.27:8082',
    pollingInterval: 3000,
    // Plus de onStateUpdate ! Le state est utilisé directement
  });

  // ========== VALEURS DÉRIVÉES (calculées à partir de state) ==========
  
  // La journée est active si le serveur a des vendeurs
  const journeeActive = (state?.vendeurs?.length ?? 0) > 0;
  
  // Liste des noms de vendeurs (pour compatibilité avec composants existants)
  const vendeurs = state?.vendeurs?.map(v => v.nom) ?? [];
  
  // Historique brut du serveur
  const historique = state?.historique ?? [];
  
  // Conversion vers l'ancien format vendeursData pour compatibilité
  const vendeursData: Record<string, VendeurData> = {};
  state?.vendeurs?.forEach(v => {
    vendeursData[v.nom] = {
      nom: v.nom,
      compteurVentes: v.ventes,
      compteurAbandons: v.abandons || 0,
      clientEnCours: v.clientEnCours ? {
        id: v.clientEnCours.id,
        heureDebut: v.clientEnCours.heureDebut,
        dateDebut: v.clientEnCours.dateDebut
      } : undefined
    };
  });

  // Ordre = liste des noms (le serveur gère déjà l'ordre)
  const ordre = vendeurs;
  const ordreInitial = vendeurs;
  // Prochain vendeur calculé par le serveur (source de vérité)
  const prochainVendeur = state?.ordreActuel?.prochainVendeur ?? null;

  // ========== ACTIONS DE CONFIGURATION (avant démarrage) ==========

  const ajouterVendeurConfig = (vendeur: string): void => {
    if (!vendeursConfig.includes(vendeur)) {
      setVendeursConfig([...vendeursConfig, vendeur]);
    }
  };

  const supprimerVendeurConfig = (vendeur: string): void => {
    setVendeursConfig(vendeursConfig.filter(v => v !== vendeur));
  };

  const monterVendeurConfig = (index: number): void => {
    if (index > 0) {
      const nouveauVendeurs = [...vendeursConfig];
      [nouveauVendeurs[index - 1], nouveauVendeurs[index]] = 
      [nouveauVendeurs[index], nouveauVendeurs[index - 1]];
      setVendeursConfig(nouveauVendeurs);
    }
  };

  const descendreVendeurConfig = (index: number): void => {
    if (index < vendeursConfig.length - 1) {
      const nouveauVendeurs = [...vendeursConfig];
      [nouveauVendeurs[index], nouveauVendeurs[index + 1]] = 
      [nouveauVendeurs[index + 1], nouveauVendeurs[index]];
      setVendeursConfig(nouveauVendeurs);
    }
  };

  // ========== ACTIONS SERVEUR ==========

  const demarrerJournee = async (): Promise<void> => {
    if (vendeursConfig.length === 0) {
      alert("Veuillez ajouter au moins un vendeur avant de démarrer la journée.");
      return;
    }

    try {
      await actions.demarrerJournee(vendeursConfig);
      // Vider la config locale après envoi au serveur
      setVendeursConfig([]);
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
    const vendeurActuel = state?.vendeurs?.find(v => v.nom === vendeur);
    
    if (!journeeActive || !vendeurActuel || vendeurActuel.clientEnCours) {
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
    const vendeurActuel = state?.vendeurs?.find(v => v.nom === vendeur);
    
    if (!journeeActive) {
      console.warn('Journée non active');
      return;
    }
    
    if (!vendeurActuel) {
      alert('Erreur: Vendeur introuvable');
      return;
    }
    
    if (!vendeurActuel.clientEnCours) {
      alert('Ce vendeur n\'a pas de client en cours');
      return;
    }

    try {
      await actions.abandonnerClient(vendeur);
      await refresh();
    } catch (err) {
      console.error('Erreur abandon:', err);
      alert(`Erreur lors de l'abandon du client: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  const enregistrerVente = async (vendeur: string): Promise<void> => {
    const vendeurActuel = state?.vendeurs?.find(v => v.nom === vendeur);
    
    if (!journeeActive) {
      console.warn('Journée non active');
      return;
    }
    
    if (!vendeurActuel) {
      alert('Erreur: Vendeur introuvable');
      return;
    }
    
    if (!vendeurActuel.clientEnCours) {
      alert('Ce vendeur n\'a pas de client en cours');
      return;
    }

    try {
      await actions.enregistrerVente(vendeur);
      await refresh();
    } catch (err) {
      console.error('Erreur vente:', err);
      alert(`Erreur lors de l'enregistrement de la vente: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  const ajouterVendeurEnCoursDeJournee = async (vendeur: string): Promise<void> => {
    try {
      await actions.ajouterVendeur(vendeur);
    } catch (err) {
      alert('Erreur lors de l\'ajout du vendeur');
      console.error(err);
    }
  };

  const reinitialiserTout = async (): Promise<void> => {
    if (window.confirm('Êtes-vous sûr de vouloir tout réinitialiser ? Tous les vendeurs et l\'historique seront supprimés.')) {
      try {
        await actions.reinitialiser();
        setVendeursConfig([]);
      } catch (err) {
        alert('Erreur lors de la réinitialisation');
        console.error(err);
      }
    }
  };

  const exporterDonnees = (): void => {
    const donnees = {
      state,
      vendeursConfig,
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

  // ========== HELPERS UI ==========

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

  // ========== RENDU ==========

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
        // Mode configuration (utilise vendeursConfig local)
        <ConfigurationVendeurs 
          vendeurs={vendeursConfig}
          onAjouterVendeur={ajouterVendeurConfig}
          onSupprimerVendeur={supprimerVendeurConfig}
          onMonterVendeur={monterVendeurConfig}
          onDescendreVendeur={descendreVendeurConfig}
          onDemarrerJournee={demarrerJournee}
        />
      ) : (
        // Mode journée active (utilise state du serveur)
        <>
          <AjoutVendeurJournee 
            vendeursExistants={vendeurs}
            onAjouterVendeur={ajouterVendeurEnCoursDeJournee}
          />
          
          <GestionOrdre 
            ordre={ordre}
            ordreInitial={ordreInitial}
            vendeursData={vendeursData}
            prochainVendeur={prochainVendeur}
            onTerminerJournee={terminerJournee}
          />
                
          <GestionClients
            ordre={ordre}
            vendeursData={vendeursData}
            prochainVendeur={prochainVendeur}
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

      {/* Notification mode hors ligne */}
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
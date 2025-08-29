// src/components/TourDeLigneApp.tsx
import React, { useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { HistoriqueItem, VendeurData } from '../types';
import ConfigurationVendeurs from './ConfigurationVendeurs';
import GestionOrdre from './GestionOrdre';
import EnregistrementVentes from './EnregistrementVentes';
import HistoriqueVentes from './HistoriqueVentes';
import ActionButtons from './ActionButtons';
import { trierOrdreVendeurs } from '../services/vendeurService';

const TourDeLigneApp: React.FC = () => {
  // États avec localStorage
  const [vendeurs, setVendeurs] = useLocalStorage<string[]>('vendeurs', []);
  const [ordreInitial, setOrdreInitial] = useLocalStorage<string[]>('ordreInitial', []);
  const [ordre, setOrdre] = useLocalStorage<string[]>('ordre', []);
  const [historique, setHistorique] = useLocalStorage<HistoriqueItem[]>('historique', []);
  const [journeeActive, setJourneeActive] = useLocalStorage<boolean>('journeeActive', false);
  const [vendeursData, setVendeursData] = useLocalStorage<Record<string, VendeurData>>('vendeursData', {});

  // Mettre à jour l'ordre selon les règles métier chaque fois que vendeursData change
  useEffect(() => {
    if (journeeActive && ordreInitial.length > 0) {
      const nouvelOrdre = trierOrdreVendeurs(ordreInitial, ordre, vendeursData);
      if (JSON.stringify(nouvelOrdre) !== JSON.stringify(ordre)) {
        setOrdre(nouvelOrdre);
      }
    }
  }, [vendeursData, journeeActive, ordreInitial, ordre, setOrdre]);

  // Fonctions de gestion des vendeurs
  const ajouterVendeur = (vendeur: string): void => {
    if (!vendeurs.includes(vendeur)) {
      const updatedVendeurs = [...vendeurs, vendeur];
      setVendeurs(updatedVendeurs);
      
      // Initialiser les données du nouveau vendeur
      setVendeursData(prev => ({
        ...prev,
        [vendeur]: {
          nom: vendeur,
          compteurVentes: 0
        }
      }));
    }
  };

  const supprimerVendeur = (vendeur: string): void => {
    setVendeurs(vendeurs.filter(v => v !== vendeur));
    if (journeeActive) {
      setOrdre(ordre.filter(v => v !== vendeur));
      setOrdreInitial(ordreInitial.filter(v => v !== vendeur));
    }
    
    // Supprimer les données du vendeur
    const updatedVendeursData = {...vendeursData};
    delete updatedVendeursData[vendeur];
    setVendeursData(updatedVendeursData);
  };

  // Fonctions de gestion de la journée
  const demarrerJournee = (): void => {
    if (vendeurs.length === 0) {
      alert("Veuillez ajouter au moins un vendeur avant de démarrer la journée.");
      return;
    }
    
    // Définir l'ordre initial (même que la liste des vendeurs)
    const initialOrdre = [...vendeurs];
    setOrdreInitial(initialOrdre);
    setOrdre(initialOrdre);
    setJourneeActive(true);
    
    // Réinitialiser les compteurs de ventes pour tous les vendeurs
    const nouveauVendeursData: Record<string, VendeurData> = {};
    vendeurs.forEach(vendeur => {
      nouveauVendeursData[vendeur] = {
        nom: vendeur,
        compteurVentes: 0
      };
    });
    setVendeursData(nouveauVendeursData);
    
    // Ajouter à l'historique
    const maintenant = new Date();
    setHistorique([
      ...historique, 
      {
        action: 'demarrage',
        date: maintenant.toLocaleDateString(),
        heure: maintenant.toLocaleTimeString(),
        message: `Démarrage de la journée avec l'ordre: ${vendeurs.join(', ')}`
      }
    ]);
  };

  const terminerJournee = (): void => {
    if (window.confirm('Êtes-vous sûr de vouloir terminer la journée ? L\'ordre sera réinitialisé.')) {
      // Ajouter à l'historique
      const maintenant = new Date();
      setHistorique([
        ...historique, 
        {
          action: 'fin',
          date: maintenant.toLocaleDateString(),
          heure: maintenant.toLocaleTimeString(),
          message: `Fin de la journée`
        }
      ]);
      
      setJourneeActive(false);
      setOrdre([]);
      setOrdreInitial([]);
    }
  };

  // Fonction d'enregistrement des ventes
  const enregistrerVente = (vendeur: string): void => {
    if (!journeeActive || !ordre.includes(vendeur)) return;
    
    // Mettre à jour le compteur de ventes pour ce vendeur
    setVendeursData(prev => ({
      ...prev,
      [vendeur]: {
        ...(prev[vendeur] || { nom: vendeur }),
        compteurVentes: (prev[vendeur]?.compteurVentes || 0) + 1
      }
    }));
    
    // L'ordre sera automatiquement mis à jour par l'effet useEffect
    
    // Ajouter à l'historique (attendre que l'ordre soit mis à jour via useEffect)
    setTimeout(() => {
      const maintenant = new Date();
      setHistorique(prev => [
        ...prev, 
        {
          action: 'vente',
          vendeur,
          date: maintenant.toLocaleDateString(),
          heure: maintenant.toLocaleTimeString(),
          nouvelOrdre: ordre.join(', ')
        }
      ]);
    }, 0);
  };

  // Fonctions utilitaires
  const reinitialiserTout = (): void => {
    if (window.confirm('Êtes-vous sûr de vouloir tout réinitialiser ? Tous les vendeurs et l\'historique seront supprimés.')) {
      // Réinitialiser tous les états
      setVendeurs([]);
      setOrdre([]);
      setOrdreInitial([]);
      setHistorique([]);
      setJourneeActive(false);
      setVendeursData({});
      
      // Nettoyer le localStorage
      localStorage.clear();
    }
  };

  const exporterDonnees = (): void => {
    const donnees = {
      vendeurs,
      ordreInitial,
      ordre,
      historique,
      journeeActive,
      vendeursData
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

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Gestion du Tour de Ligne</h1>
      
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
    </div>
  );
};

export default TourDeLigneApp;
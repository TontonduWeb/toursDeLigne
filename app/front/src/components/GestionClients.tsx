// src/components/GestionClients.tsx
import React from 'react';
import { VendeurData } from '../types';
import { getNombreMinimumVentes } from '../services/vendeurService';

interface GestionClientsProps {
  ordre: string[];
  vendeursData: Record<string, VendeurData>;
  onPrendreClient: (vendeur: string) => void;
  onAbandonnerClient: (vendeur: string) => void;
}

const GestionClients: React.FC<GestionClientsProps> = ({
  ordre,
  vendeursData,
  onPrendreClient,
  onAbandonnerClient
}) => {
  const minVentes = getNombreMinimumVentes(vendeursData);
  
  // Trouver les vendeurs disponibles (sans client en cours)
  const vendeursDisponibles = ordre.filter(vendeur => !vendeursData[vendeur]?.clientEnCours);
  const vendeursOccupes = ordre.filter(vendeur => vendeursData[vendeur]?.clientEnCours);

  const prochainVendeur = vendeursDisponibles[0];

  return (
    <div className="mb-8 p-4 bg-blue-50 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Gestion des Clients</h2>
      
      {/* Section: Prochain vendeur disponible */}
      {prochainVendeur && (
        <div className="mb-6 p-4 bg-white rounded border text-center">
          <h3 className="font-bold text-blue-600">Prochain vendeur disponible</h3>
          <div className="text-2xl font-bold text-blue-700 mt-2">{prochainVendeur}</div>
          <button 
            onClick={() => onPrendreClient(prochainVendeur)}
            className="mt-3 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 font-semibold"
          >
            Prendre un client
          </button>
        </div>
      )}

      {/* Section: Vendeurs occupés */}
      {vendeursOccupes.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3 text-orange-700">Vendeurs avec clients en cours</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vendeursOccupes.map((vendeur) => {
              const vendeurData = vendeursData[vendeur];
              const client = vendeurData?.clientEnCours;
              const nbVentes = vendeurData?.compteurVentes || 0;
              
              if (!client) return null;
              
              const dureeClient = calculerDuree(client.dateDebut, client.heureDebut);
              
              return (
                <div key={vendeur} className="p-3 bg-orange-50 rounded border border-orange-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <strong>{vendeur}</strong>
                      <span className="ml-2 text-sm text-gray-600">
                        ({nbVentes} vente{nbVentes !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <span className="text-xs text-orange-600 font-medium">
                      {dureeClient}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    Client pris en charge à {client.heureDebut}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAbandonnerClient(vendeur)}
                      className="flex-1 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                    >
                      Abandonner client
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section: Vendeurs disponibles en attente */}
      {vendeursDisponibles.length > 1 && (
        <div>
          <h3 className="font-semibold mb-3">Vendeurs en attente</h3>
          <div className="flex flex-wrap gap-2">
            {vendeursDisponibles.slice(1).map((vendeur, index) => {
              const nbVentes = vendeursData[vendeur]?.compteurVentes || 0;
              const estMinimum = nbVentes === minVentes;
              
              return (
                <div 
                  key={vendeur}
                  className={`p-2 rounded border text-sm ${
                    estMinimum ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50'
                  }`}
                >
                  {index + 2}. {vendeur} ({nbVentes})
                  {estMinimum && 
                    <span className="ml-1 text-xs text-yellow-700">(min)</span>
                  }
                </div>
              );
            })}
          </div>
        </div>
      )}

      {vendeursDisponibles.length === 0 && (
        <div className="text-center p-4 bg-yellow-50 rounded border border-yellow-200">
          <p className="text-yellow-800 font-medium">
            🚫 Tous les vendeurs sont occupés avec des clients
          </p>
        </div>
      )}
    </div>
  );
};

// Fonction utilitaire pour calculer la durée - VERSION CORRIGÉE
function calculerDuree(dateDebut: string, heureDebut: string): string {
  try {
    // Parsing robuste de la date et heure
    // Format attendu: dateDebut = "15/10/2025", heureDebut = "14:30:25"
    const [jour, mois, annee] = dateDebut.split('/');
    const [heures, minutes, secondes] = heureDebut.split(':');
    
    // Créer la date de début avec le format ISO
    const debut = new Date(
      parseInt(annee),
      parseInt(mois) - 1, // Les mois commencent à 0
      parseInt(jour),
      parseInt(heures),
      parseInt(minutes),
      parseInt(secondes || '0')
    );
    
    // Vérifier que la date est valide
    if (isNaN(debut.getTime())) {
      console.error('Date invalide:', { dateDebut, heureDebut });
      return "Erreur";
    }
    
    const maintenant = new Date();
    const diffMs = maintenant.getTime() - debut.getTime();
    const minutes_totales = Math.floor(diffMs / (1000 * 60));
    
    if (minutes_totales < 0) return "0min";
    if (minutes_totales < 1) return "< 1min";
    if (minutes_totales < 60) return `${minutes_totales}min`;
    
    const heures_ecoulees = Math.floor(minutes_totales / 60);
    const minutesRestantes = minutes_totales % 60;
    return `${heures_ecoulees}h${minutesRestantes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Erreur calcul durée:', error, { dateDebut, heureDebut });
    return "Erreur";
  }
}

export default GestionClients;
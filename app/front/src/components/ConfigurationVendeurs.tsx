import React, { useState } from 'react';
import { PlanningJournee } from '../types';

interface ConfigurationVendeursProps {
  vendeurs: string[];
  onAjouterVendeur: (vendeur: string) => void;
  onSupprimerVendeur: (vendeur: string) => void;
  onMonterVendeur: (index: number) => void;
  onDescendreVendeur: (index: number) => void;
  onDemarrerJournee: () => void;
  planningDuJour?: PlanningJournee | null;
  onChargerPlanning?: () => void;
}

const ConfigurationVendeurs: React.FC<ConfigurationVendeursProps> = ({
  vendeurs,
  onAjouterVendeur,
  onSupprimerVendeur,
  onMonterVendeur,
  onDescendreVendeur,
  onDemarrerJournee,
  planningDuJour,
  onChargerPlanning,
}) => {
  const [nouveauVendeur, setNouveauVendeur] = useState<string>('');

  const handleAjouter = (): void => {
    if (nouveauVendeur.trim() && !vendeurs.includes(nouveauVendeur.trim())) {
      onAjouterVendeur(nouveauVendeur.trim());
      setNouveauVendeur('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleAjouter();
    }
  };

  return (
    <div className="mb-8 p-4 bg-blue-50 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Configuration des Vendeurs</h2>

      {/* Bannière planning du jour */}
      {planningDuJour && onChargerPlanning && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg flex items-center justify-between">
          <div>
            <p className="font-medium text-green-800">
              Planning du jour disponible ({planningDuJour.vendeurs.filter(v => v.present === 1).length} vendeur{planningDuJour.vendeurs.filter(v => v.present === 1).length > 1 ? 's' : ''})
            </p>
            <p className="text-sm text-green-600">
              {planningDuJour.vendeurs.filter(v => v.present === 1).map(v => v.nom).join(', ')}
            </p>
          </div>
          <button
            onClick={onChargerPlanning}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            Charger le planning du jour
          </button>
        </div>
      )}

      {/* Section d'ajout */}
      <div className="flex mb-4">
        <input
          type="text"
          value={nouveauVendeur}
          onChange={(e) => setNouveauVendeur(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nom du vendeur"
          className="flex-grow p-2 border rounded mr-2"
        />
        <button 
          onClick={handleAjouter}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Ajouter
        </button>
      </div>
      
      {/* Liste des vendeurs avec réorganisation */}
      {vendeurs.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-sm">
            <strong>💡 Important :</strong> L'ordre ci-dessous définit la priorité initiale. 
            Utilisez les flèches pour réorganiser avant de démarrer la journée.
          </div>
          
          <div className="space-y-2">
            {vendeurs.map((vendeur, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-white rounded border hover:border-blue-300 transition-colors"
              >
                {/* Numéro d'ordre */}
                <div className="flex items-center space-x-3 flex-grow">
                  <span className="font-bold text-blue-600 text-lg w-8">
                    {index + 1}.
                  </span>
                  <span className="font-medium">{vendeur}</span>
                </div>
                
                {/* Boutons d'action */}
                <div className="flex items-center space-x-1">
                  {/* Bouton Monter */}
                  <button
                    onClick={() => onMonterVendeur(index)}
                    disabled={index === 0}
                    className={`p-2 rounded ${
                      index === 0
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                    title="Monter dans l'ordre"
                  >
                    ⬆️
                  </button>
                  
                  {/* Bouton Descendre */}
                  <button
                    onClick={() => onDescendreVendeur(index)}
                    disabled={index === vendeurs.length - 1}
                    className={`p-2 rounded ${
                      index === vendeurs.length - 1
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                    title="Descendre dans l'ordre"
                  >
                    ⬇️
                  </button>
                  
                  {/* Bouton Supprimer */}
                  <button 
                    onClick={() => onSupprimerVendeur(vendeur)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Bouton démarrer */}
      {vendeurs.length > 0 && (
        <div className="text-center">
          <button 
            onClick={onDemarrerJournee}
            className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600 font-semibold text-lg"
          >
            🚀 Démarrer la Journée ({vendeurs.length} vendeur{vendeurs.length > 1 ? 's' : ''})
          </button>
          <p className="text-sm text-gray-600 mt-2">
            L'ordre ne pourra plus être modifié après le démarrage
          </p>
        </div>
      )}
      
      {vendeurs.length === 0 && (
        <div className="text-center p-4 bg-gray-50 rounded border">
          <p className="text-gray-600">
            Ajoutez au moins un vendeur pour démarrer la journée
          </p>
        </div>
      )}
    </div>
  );
};

export default ConfigurationVendeurs;
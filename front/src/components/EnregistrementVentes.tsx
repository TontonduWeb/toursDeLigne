// src/components/EnregistrementVentes.tsx
import React from 'react';
import { VendeurData } from '../types';
import { getNombreMinimumVentes } from '../services/vendeurService';

interface EnregistrementVentesProps {
  ordre: string[];
  vendeursData: Record<string, VendeurData>;
  onEnregistrerVente: (vendeur: string) => void;
}

const EnregistrementVentes: React.FC<EnregistrementVentesProps> = ({
  ordre,
  vendeursData,
  onEnregistrerVente
}) => {
  // Déterminer le nombre minimum de ventes
  const minVentes = getNombreMinimumVentes(vendeursData);
  
  return (
    <div className="mb-8 p-4 bg-yellow-50 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Enregistrer une Vente</h2>
      <p className="mb-4">Sélectionnez le vendeur qui a réalisé une vente :</p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {ordre.map((vendeur, index) => {
          const nbVentes = vendeursData[vendeur]?.compteurVentes || 0;
          const estMinimum = nbVentes === minVentes;
          
          return (
            <button 
              key={index} 
              onClick={() => onEnregistrerVente(vendeur)}
              className={`p-3 rounded border text-center ${
                index === 0 ? 'bg-green-100 border-green-300 font-bold' : 
                estMinimum ? 'bg-yellow-50 border-yellow-300' : 'bg-white hover:bg-gray-100'
              }`}
            >
              {vendeur} ({nbVentes} vente{nbVentes !== 1 ? 's' : ''})
              {estMinimum && index !== 0 && 
                <span className="block text-xs text-yellow-700">
                  (minimum)
                </span>
              }
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EnregistrementVentes;
// src/components/GestionOrdre.tsx
import React from 'react';
import { VendeurData } from '../types';
import { getNombreMinimumVentes } from '../services/vendeurService';

interface GestionOrdreProps {
  ordre: string[];
  ordreInitial: string[];
  vendeursData: Record<string, VendeurData>;
  onTerminerJournee: () => void;
}

const GestionOrdre: React.FC<GestionOrdreProps> = ({
  ordre,
  ordreInitial,
  vendeursData,
  onTerminerJournee
}) => {
  // Déterminer le nombre minimum de ventes
  const minVentes = getNombreMinimumVentes(vendeursData);

  return (
    <div className="mb-8 p-4 bg-green-50 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Ordre Actuel</h2>
        <button 
          onClick={onTerminerJournee}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Terminer la Journée
        </button>
      </div>
      
      {ordre.length > 0 ? (
        <>
          <div className="mb-6 p-4 bg-white rounded border text-center">
            <h3 className="font-bold">Prochain vendeur</h3>
            <div className="text-2xl font-bold text-green-600 mt-2">{ordre[0]}</div>
          </div>
          
          <h3 className="font-semibold mb-2">Ordre de passage</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {ordre.map((vendeur, index) => {
              const nbVentes = vendeursData[vendeur]?.compteurVentes || 0;
              const estMinimum = nbVentes === minVentes;
              
              return (
                <div 
                  key={index} 
                  className={`p-2 rounded border ${
                    index === 0 ? 'bg-green-100 border-green-300 font-bold' : 
                    estMinimum ? 'bg-yellow-50 border-yellow-300' : 'bg-white'
                  }`}
                >
                  {index + 1}. {vendeur} ({nbVentes} vente{nbVentes !== 1 ? 's' : ''})
                  {estMinimum && index !== 0 && 
                    <span className="ml-1 text-xs text-yellow-700">
                      (min)
                    </span>
                  }
                </div>
              );
            })}
          </div>
          
          <div className="p-3 bg-blue-50 rounded border border-blue-200 mt-4">
            <h4 className="text-sm font-semibold mb-1">Règles de priorité :</h4>
            <ul className="text-xs text-blue-800 pl-4 list-disc">
              <li>Les vendeurs avec le moins de ventes ({minVentes}) sont prioritaires</li>
              <li>En cas d'égalité, l'ordre initial est respecté</li>
              <li>Si tous les vendeurs ont le même nombre de ventes, l'ordre initial est utilisé</li>
            </ul>
          </div>
        </>
      ) : (
        <p className="text-center p-4 bg-white rounded border">Aucun vendeur dans l'ordre</p>
      )}
    </div>
  );
};

export default GestionOrdre;
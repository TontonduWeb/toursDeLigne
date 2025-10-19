// src/components/GestionOrdre.tsx
import React from 'react';
import { VendeurData } from '../types';
import { 
  getNombreMinimumVentes, 
  getVendeursDisponibles, 
  getVendeursOccupes,
  calculerStatistiquesVendeurs 
} from '../services/vendeurService';

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
  // Statistiques et données calculées
  const minVentes = getNombreMinimumVentes(vendeursData);
  const vendeursDisponibles = getVendeursDisponibles(ordre, vendeursData);
  const stats = calculerStatistiquesVendeurs(vendeursData);
  
  const prochainVendeurDisponible = vendeursDisponibles[0];

  return (
    <div className="mb-8 p-4 bg-green-50 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">État de l'Équipe</h2>
        <button 
          onClick={onTerminerJournee}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Terminer la Journée
        </button>
      </div>

      {/* Statistiques générales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-3 rounded border text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalVendeurs}</div>
          <div className="text-sm text-gray-600">Vendeurs total</div>
        </div>
        <div className="bg-white p-3 rounded border text-center">
          <div className="text-2xl font-bold text-green-600">{stats.vendeursDisponibles}</div>
          <div className="text-sm text-gray-600">Disponibles</div>
        </div>
        <div className="bg-white p-3 rounded border text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.vendeursOccupes}</div>
          <div className="text-sm text-gray-600">Avec clients</div>
        </div>
        <div className="bg-white p-3 rounded border text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.totalVentes}</div>
          <div className="text-sm text-gray-600">Ventes totales</div>
        </div>
      </div>
      
      {ordre.length > 0 ? (
        <>
          {/* Prochain vendeur disponible */}
          {prochainVendeurDisponible && (
            <div className="mb-6 p-4 bg-white rounded border text-center">
              <h3 className="font-bold text-green-700">Prochain vendeur disponible</h3>
              <div className="text-2xl font-bold text-green-600 mt-2">
                {prochainVendeurDisponible}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {vendeursData[prochainVendeurDisponible]?.compteurVentes || 0} vente(s)
              </div>
            </div>
          )}

          {!prochainVendeurDisponible && (
            <div className="mb-6 p-4 bg-yellow-50 rounded border text-center border-yellow-200">
              <h3 className="font-bold text-yellow-700">Tous les vendeurs sont occupés</h3>
              <div className="text-sm text-yellow-600 mt-1">
                En attente qu'un vendeur se libère...
              </div>
            </div>
          )}
          
          {/* Ordre complet avec statuts */}
          <h3 className="font-semibold mb-3">Ordre complet (disponibles puis occupés)</h3>
          <div className="space-y-2 mb-4">
            {ordre.map((vendeur, index) => {
              const vendeurData = vendeursData[vendeur];
              const nbVentes = vendeurData?.compteurVentes || 0;
              const clientEnCours = vendeurData?.clientEnCours;
              const estMinimum = nbVentes === minVentes;
              const estDisponible = !clientEnCours;
              const estProchain = vendeur === prochainVendeurDisponible;
              
              return (
                <div 
                  key={index} 
                  className={`p-3 rounded border flex justify-between items-center ${
                    estProchain ? 'bg-green-100 border-green-300 font-bold' :
                    !estDisponible ? 'bg-orange-50 border-orange-200' :
                    estMinimum ? 'bg-yellow-50 border-yellow-300' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">
                      {index + 1}. {vendeur}
                    </span>
                    <span className="text-sm text-gray-600">
                      ({nbVentes} vente{nbVentes !== 1 ? 's' : ''})
                    </span>
                    {estMinimum && estDisponible && (
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                        minimum
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {clientEnCours ? (
                      <div className="text-right">
                        <div className="text-xs text-orange-600 font-medium">
                          👤 Client en cours
                        </div>
                        <div className="text-xs text-gray-500">
                          depuis {clientEnCours.heureDebut}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">
                        ✅ Disponible
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Règles et informations */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <h4 className="text-sm font-semibold mb-2 text-blue-800">Règles de priorité :</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Seuls les vendeurs disponibles peuvent prendre des clients</li>
                <li>• Priorité aux vendeurs avec le moins de ventes ({minVentes})</li>
                <li>• En cas d'égalité, l'ordre initial est respecté</li>
                <li>• Les vendeurs occupés restent en fin de liste</li>
              </ul>
            </div>
            
            <div className="p-3 bg-gray-50 rounded border">
              <h4 className="text-sm font-semibold mb-2">Répartition actuelle :</h4>
              <div className="text-xs space-y-1">
                <div>📊 Moyenne de ventes: {stats.moyenneVentes}</div>
                <div>🎯 Objectif d'équilibrage: {minVentes} ventes minimum</div>
                <div>⏱️ Vendeurs en cours: {stats.vendeursOccupes}/{stats.totalVendeurs}</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-center p-4 bg-white rounded border">Aucun vendeur dans l'ordre</p>
      )}
    </div>
  );
};

export default GestionOrdre;
import React from 'react';

interface RecapitulatifJourneeProps {
  exportData: any;
  onFermer: () => void;
}

const RecapitulatifJournee: React.FC<RecapitulatifJourneeProps> = ({
  exportData,
  onFermer
}) => {
  if (!exportData) return null;

  const { dateClôture, heureClôture, statistiques, vendeurs } = exportData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-green-700">
                ✅ Journée Clôturée
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {dateClôture} à {heureClôture}
              </p>
            </div>
            <button
              onClick={onFermer}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">
                {statistiques.totalVendeurs}
              </div>
              <div className="text-sm text-gray-600">Vendeurs</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">
                {statistiques.totalVentes}
              </div>
              <div className="text-sm text-gray-600">Ventes totales</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-600">
                {statistiques.moyenneVentes}
              </div>
              <div className="text-sm text-gray-600">Moyenne/vendeur</div>
            </div>
          </div>

          {/* Détail par vendeur */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Détail par vendeur</h3>
            <div className="space-y-2">
              {vendeurs
                .sort((a: any, b: any) => b.ventes - a.ventes)
                .map((vendeur: any, index: number) => (
                  <div
                    key={vendeur.nom}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-gray-400">#{index + 1}</span>
                      <span className="font-medium">{vendeur.nom}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {vendeur.ventes} vente{vendeur.ventes !== 1 ? 's' : ''}
                      </div>
                      {vendeur.clientEnCours && (
                        <span className="text-xs text-orange-500">
                          (client en cours non finalisé)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Bouton de fermeture */}
          <button
            onClick={onFermer}
            className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-semibold"
          >
            Fermer le récapitulatif
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecapitulatifJournee;
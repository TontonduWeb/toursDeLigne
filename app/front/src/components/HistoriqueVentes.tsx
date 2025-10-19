import React from 'react';
import { HistoriqueItem } from '../types';

interface HistoriqueVentesProps {
  historique: HistoriqueItem[];
}

const HistoriqueVentes: React.FC<HistoriqueVentesProps> = ({ historique }) => {
  return (
    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Historique</h2>
      
      {historique.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="border p-2">Date</th>
                <th className="border p-2">Heure</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {historique.slice().reverse().map((item, index) => (
                <tr key={index}>
                  <td className="border p-2">{item.date}</td>
                  <td className="border p-2">{item.heure}</td>
                  <td className="border p-2">
                    {item.action === 'vente' ? (
                      <span className="text-green-600">✅ Vente par {item.vendeur}</span>
                    ) : item.action === 'prise_client' ? (
                      <span className="text-blue-600">👤 {item.vendeur} prend un client</span>
                    ) : item.action === 'abandon_client' ? (
                      <span className="text-orange-600">❌ {item.vendeur} abandonne un client</span>
                    ) : item.action === 'demarrage' ? (
                      <span className="text-blue-600">🚀 Démarrage journée</span>
                    ) : item.action === 'fin' ? (
                      <span className="text-red-600">🏁 Fin journée</span>
                    ) : (
                      <span className="text-gray-600">{item.message || 'Action inconnue'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center p-4 bg-white rounded border">Aucun historique disponible</p>
      )}
    </div>
  );
};

export default HistoriqueVentes;
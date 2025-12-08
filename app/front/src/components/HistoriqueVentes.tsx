import React from 'react';

interface HistoriqueEntry {
  date: string;
  heure: string;
  action: string;
  vendeur?: string;
  clientId?: string;
}

interface HistoriqueVentesProps {
  historique: HistoriqueEntry[];
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
                    {item.action.includes('Vente') ? (
                      <span className="text-green-600">✅ {item.action}</span>
                    ) : item.action.includes('Client pris') ? (
                      <span className="text-blue-600">👤 {item.action}</span>
                    ) : item.action.includes('abandonné') ? (
                      <span className="text-orange-600">❌ {item.action}</span>
                    ) : item.action.includes('Démarrage') ? (
                      <span className="text-blue-600">🚀 {item.action}</span>
                    ) : item.action.includes('ajouté') ? (
                      <span className="text-purple-600">➕ {item.action}</span>
                    ) : (
                      <span className="text-gray-600">{item.action}</span>
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
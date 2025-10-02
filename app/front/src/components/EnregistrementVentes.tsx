// src/components/EnregistrementVentes.tsx
import React from 'react';
import { VendeurData } from '../types';

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
  // Seuls les vendeurs avec un client en cours peuvent enregistrer une vente
  const vendeursAvecClient = ordre.filter(vendeur => vendeursData[vendeur]?.clientEnCours);
  
  return (
    <div className="mb-8 p-4 bg-green-50 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Enregistrer une Vente</h2>
      <p className="mb-4">Sélectionnez le vendeur qui a finalisé une vente avec son client :</p>
      
      {vendeursAvecClient.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {vendeursAvecClient.map((vendeur) => {
            const vendeurData = vendeursData[vendeur];
            const nbVentes = vendeurData?.compteurVentes || 0;
            const client = vendeurData?.clientEnCours;
            
            if (!client) return null;
            
            const dureeClient = calculerDuree(client.dateDebut, client.heureDebut);
            
            return (
              <button 
                key={vendeur} 
                onClick={() => onEnregistrerVente(vendeur)}
                className="p-4 bg-white rounded border hover:bg-green-50 border-green-300 text-left transition-colors"
              >
                <div className="font-semibold text-green-700">{vendeur}</div>
                <div className="text-sm text-gray-600">
                  {nbVentes} vente{nbVentes !== 1 ? 's' : ''} • Client depuis {dureeClient}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Cliquer pour finaliser la vente
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-4 bg-gray-50 rounded border">
          <p className="text-gray-600">
            Aucun vendeur n'a de client en cours. 
            <br />
            <span className="text-sm">Les vendeurs doivent d'abord prendre un client en charge.</span>
          </p>
        </div>
      )}
    </div>
  );
};

// Fonction utilitaire pour calculer la durée (même que dans GestionClients)
function calculerDuree(dateDebut: string, heureDebut: string): string {
  const debut = new Date(`${dateDebut} ${heureDebut}`);
  const maintenant = new Date();
  const diffMs = maintenant.getTime() - debut.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  
  if (minutes < 1) return "< 1min";
  if (minutes < 60) return `${minutes}min`;
  
  const heures = Math.floor(minutes / 60);
  const minutesRestantes = minutes % 60;
  return `${heures}h${minutesRestantes.toString().padStart(2, '0')}`;
}

export default EnregistrementVentes;
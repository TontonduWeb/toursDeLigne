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

export default EnregistrementVentes;
import React, { useState } from 'react';

interface ConfigurationVendeursProps {
  vendeurs: string[];
  onAjouterVendeur: (vendeur: string) => void;
  onSupprimerVendeur: (vendeur: string) => void;
  onDemarrerJournee: () => void;
}

const ConfigurationVendeurs: React.FC<ConfigurationVendeursProps> = ({
  vendeurs,
  onAjouterVendeur,
  onSupprimerVendeur,
  onDemarrerJournee
}) => {
  const [nouveauVendeur, setNouveauVendeur] = useState<string>('');

  const handleAjouter = (): void => {
    if (nouveauVendeur.trim() && !vendeurs.includes(nouveauVendeur.trim())) {
      onAjouterVendeur(nouveauVendeur.trim());
      setNouveauVendeur('');
    }
  };

  return (
    <div className="mb-8 p-4 bg-blue-50 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Configuration des Vendeurs</h2>
      <div className="flex mb-4">
        <input
          type="text"
          value={nouveauVendeur}
          onChange={(e) => setNouveauVendeur(e.target.value)}
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
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        {vendeurs.map((vendeur, index) => (
          <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
            <span>{vendeur}</span>
            <button 
              onClick={() => onSupprimerVendeur(vendeur)}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      
      {vendeurs.length > 0 && (
        <div className="text-center">
          <button 
            onClick={onDemarrerJournee}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
          >
            Démarrer la Journée
          </button>
        </div>
      )}
    </div>
  );
};

export default ConfigurationVendeurs;
import React, { useState } from 'react';

interface AjoutVendeurJourneeProps {
  vendeursExistants: string[];
  onAjouterVendeur: (vendeur: string) => void;
}

const AjoutVendeurJournee: React.FC<AjoutVendeurJourneeProps> = ({
  vendeursExistants,
  onAjouterVendeur
}) => {
  const [nouveauVendeur, setNouveauVendeur] = useState<string>('');
  const [afficherFormulaire, setAfficherFormulaire] = useState<boolean>(false);

  const handleAjouter = (): void => {
    const vendeurTrim = nouveauVendeur.trim();
    
    if (!vendeurTrim) {
      alert("Veuillez entrer un nom de vendeur.");
      return;
    }
    
    if (vendeursExistants.includes(vendeurTrim)) {
      alert("Ce vendeur est déjà dans la liste.");
      return;
    }
    
    onAjouterVendeur(vendeurTrim);
    setNouveauVendeur('');
    setAfficherFormulaire(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleAjouter();
    } else if (e.key === 'Escape') {
      setNouveauVendeur('');
      setAfficherFormulaire(false);
    }
  };

  return (
    <div className="mb-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-purple-800">
          👤 Ajouter un vendeur
        </h2>
        {!afficherFormulaire && (
          <button
            onClick={() => setAfficherFormulaire(true)}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 font-medium"
          >
            + Nouveau vendeur
          </button>
        )}
      </div>

      {afficherFormulaire ? (
        <div className="bg-white p-4 rounded border border-purple-300">
          <p className="text-sm text-gray-600 mb-3">
            💡 <strong>Le nouveau vendeur sera ajouté en priorité</strong> après les vendeurs occupés.
          </p>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={nouveauVendeur}
              onChange={(e) => setNouveauVendeur(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Nom du vendeur"
              className="flex-grow p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
            <button
              onClick={handleAjouter}
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 font-medium"
            >
              ✓ Ajouter
            </button>
            <button
              onClick={() => {
                setNouveauVendeur('');
                setAfficherFormulaire(false);
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Annuler
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Appuyez sur <kbd className="px-1 py-0.5 bg-gray-100 border rounded">Entrée</kbd> pour valider 
            ou <kbd className="px-1 py-0.5 bg-gray-100 border rounded">Échap</kbd> pour annuler
          </p>
        </div>
      ) : (
        <p className="text-sm text-purple-700">
          Vous pouvez ajouter de nouveaux vendeurs pendant la journée. 
          Ils seront placés en priorité dans l'ordre.
        </p>
      )}
    </div>
  );
};

export default AjoutVendeurJournee;
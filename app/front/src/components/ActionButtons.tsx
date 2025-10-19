import React from 'react';

interface ActionButtonsProps {
  onExporterDonnees: () => void;
  onReinitialiserTout: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onExporterDonnees,
  onReinitialiserTout
}) => {
  return (
    <div className="flex justify-between">
      <button 
        onClick={onExporterDonnees}
        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
      >
        Exporter les données
      </button>
      
      <button 
        onClick={onReinitialiserTout}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        title="Supprime TOUS les vendeurs et l'historique complet"
      >
        🗑️ Réinitialiser tout (RAZ complète)
      </button>
    </div>
  );
};

export default ActionButtons;
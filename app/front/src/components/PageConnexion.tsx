import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || '';

const PageConnexion: React.FC = () => {
  const navigate = useNavigate();
  const { connexion, estConnecte, estAdmin } = useAuthContext();

  const [vendeurs, setVendeurs] = useState<string[]>([]);
  const [nomSelectionne, setNomSelectionne] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [shake, setShake] = useState(false);

  // Rediriger si déjà connecté
  useEffect(() => {
    if (estConnecte) {
      navigate(estAdmin ? '/admin' : '/', { replace: true });
    }
  }, [estConnecte, estAdmin, navigate]);

  // Charger la liste des vendeurs
  useEffect(() => {
    fetch(`${API_URL}/api/connexion/vendeurs`)
      .then(res => res.json())
      .then(data => setVendeurs(data.vendeurs || []))
      .catch(() => setErreur('Impossible de charger la liste des vendeurs'));
  }, []);

  const handlePinPress = useCallback((digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
      setErreur(null);
    }
  }, [pin]);

  const handlePinDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setErreur(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!nomSelectionne || pin.length !== 4) return;

    setChargement(true);
    setErreur(null);

    try {
      const result = await connexion(nomSelectionne, pin, API_URL);
      navigate(result.utilisateur.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setErreur('Nom ou code PIN incorrect');
      setPin('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setChargement(false);
    }
  }, [nomSelectionne, pin, connexion, navigate]);

  // Soumettre automatiquement quand le PIN fait 4 chiffres
  useEffect(() => {
    if (pin.length === 4 && nomSelectionne) {
      handleSubmit();
    }
  }, [pin, nomSelectionne, handleSubmit]);

  const handleRetour = () => {
    setNomSelectionne(null);
    setPin('');
    setErreur(null);
  };

  // Etape 1 : Sélection du nom
  if (!nomSelectionne) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-2">Tour de Ligne</h1>
          <p className="text-gray-600 text-center mb-8">Sélectionnez votre nom</p>

          {erreur && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
              {erreur}
            </div>
          )}

          <div className="space-y-3">
            {vendeurs.map(nom => (
              <button
                key={nom}
                onClick={() => setNomSelectionne(nom)}
                className="w-full py-4 px-6 bg-white border-2 border-gray-200 rounded-xl text-lg font-medium
                           hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 transition-colors"
              >
                {nom}
              </button>
            ))}
          </div>

          {vendeurs.length === 0 && !erreur && (
            <p className="text-gray-400 text-center mt-8">Chargement...</p>
          )}
        </div>
      </div>
    );
  }

  // Etape 2 : Saisie du PIN
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <button
          onClick={handleRetour}
          className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Retour
        </button>

        <h2 className="text-xl font-bold text-center mb-1">{nomSelectionne}</h2>
        <p className="text-gray-600 text-center mb-6">Entrez votre code PIN</p>

        {erreur && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center text-sm">
            {erreur}
          </div>
        )}

        {/* Affichage PIN */}
        <div className={`flex justify-center gap-4 mb-8 ${shake ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl
                ${i < pin.length
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-white border-gray-300'
                }`}
            >
              {i < pin.length && <span className="text-white">●</span>}
            </div>
          ))}
        </div>

        {/* Pavé numérique */}
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <button
              key={digit}
              onClick={() => handlePinPress(digit)}
              disabled={chargement || pin.length >= 4}
              className="h-16 rounded-xl bg-white border-2 border-gray-200 text-2xl font-medium
                         hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              {digit}
            </button>
          ))}
          <div /> {/* Espace vide */}
          <button
            onClick={() => handlePinPress('0')}
            disabled={chargement || pin.length >= 4}
            className="h-16 rounded-xl bg-white border-2 border-gray-200 text-2xl font-medium
                       hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            0
          </button>
          <button
            onClick={handlePinDelete}
            disabled={chargement || pin.length === 0}
            className="h-16 rounded-xl bg-gray-200 border-2 border-gray-300 text-lg font-medium
                       hover:bg-gray-300 active:bg-gray-400 disabled:opacity-50 transition-colors"
          >
            ←
          </button>
        </div>

        {chargement && (
          <p className="text-center text-gray-500 mt-6">Connexion...</p>
        )}
      </div>

      {/* Animation shake en CSS inline */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default PageConnexion;

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { Utilisateur } from '../types';

const API_URL = process.env.REACT_APP_API_URL || '';

interface FormUtilisateur {
  nom: string;
  pin: string;
  pinConfirmation: string;
  role: 'vendeur' | 'admin';
}

const GestionUtilisateurs: React.FC = () => {
  const { getAuthHeaders } = useAuthContext();
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [showAjout, setShowAjout] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormUtilisateur>({ nom: '', pin: '', pinConfirmation: '', role: 'vendeur' });
  const [editForm, setEditForm] = useState<{ nom: string; pin: string; actif: boolean }>({ nom: '', pin: '', actif: true });

  const chargerUtilisateurs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/utilisateurs`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setUtilisateurs(data.utilisateurs || []);
    } catch (err) {
      setErreur('Impossible de charger les utilisateurs');
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    chargerUtilisateurs();
  }, [chargerUtilisateurs]);

  const handleAjouter = async () => {
    setErreur(null);

    if (!form.nom.trim()) {
      setErreur('Le nom est requis');
      return;
    }
    if (!/^\d{4}$/.test(form.pin)) {
      setErreur('Le PIN doit être exactement 4 chiffres');
      return;
    }
    if (form.pin !== form.pinConfirmation) {
      setErreur('Les PINs ne correspondent pas');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/utilisateurs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ nom: form.nom.trim(), pin: form.pin, role: form.role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur création');
      }

      setForm({ nom: '', pin: '', pinConfirmation: '', role: 'vendeur' });
      setShowAjout(false);
      chargerUtilisateurs();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleModifier = async (id: number) => {
    setErreur(null);

    const updates: Record<string, any> = {};
    if (editForm.nom.trim()) updates.nom = editForm.nom.trim();
    if (editForm.pin) {
      if (!/^\d{4}$/.test(editForm.pin)) {
        setErreur('Le PIN doit être exactement 4 chiffres');
        return;
      }
      updates.pin = editForm.pin;
    }
    updates.actif = editForm.actif ? 1 : 0;

    try {
      const res = await fetch(`${API_URL}/api/utilisateurs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur modification');
      }

      setEditId(null);
      chargerUtilisateurs();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleSupprimer = async (id: number, nom: string) => {
    if (!window.confirm(`Supprimer l'utilisateur "${nom}" ?`)) return;

    setErreur(null);
    try {
      const res = await fetch(`${API_URL}/api/utilisateurs/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur suppression');
      }

      chargerUtilisateurs();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const ouvrirEdition = (u: Utilisateur) => {
    setEditId(u.id);
    setEditForm({ nom: u.nom, pin: '', actif: u.actif === 1 });
    setErreur(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Utilisateurs</h2>
        <button
          onClick={() => { setShowAjout(true); setErreur(null); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          + Ajouter un vendeur
        </button>
      </div>

      {erreur && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {erreur}
        </div>
      )}

      {/* Modale ajout */}
      {showAjout && (
        <div className="mb-4 p-4 bg-white rounded-lg border-2 border-blue-200">
          <h3 className="font-medium mb-3">Nouvel utilisateur</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nom"
              value={form.nom}
              onChange={e => setForm({ ...form, nom: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              maxLength={50}
            />
            <input
              type="password"
              placeholder="PIN (4 chiffres)"
              value={form.pin}
              onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) setForm({ ...form, pin: e.target.value }); }}
              className="w-full px-3 py-2 border rounded-lg"
              maxLength={4}
            />
            <input
              type="password"
              placeholder="Confirmer le PIN"
              value={form.pinConfirmation}
              onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) setForm({ ...form, pinConfirmation: e.target.value }); }}
              className="w-full px-3 py-2 border rounded-lg"
              maxLength={4}
            />
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as 'vendeur' | 'admin' })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="vendeur">Vendeur</option>
              <option value="admin">Administrateur</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAjouter}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                Créer
              </button>
              <button
                onClick={() => { setShowAjout(false); setForm({ nom: '', pin: '', pinConfirmation: '', role: 'vendeur' }); }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nom</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Rôle</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Créé le</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {utilisateurs.map(u => (
              <tr key={u.id} className={u.actif === 0 ? 'opacity-50' : ''}>
                <td className="px-4 py-3 font-medium">
                  {editId === u.id ? (
                    <input
                      type="text"
                      value={editForm.nom}
                      onChange={e => setEditForm({ ...editForm, nom: e.target.value })}
                      className="px-2 py-1 border rounded w-full"
                      maxLength={50}
                    />
                  ) : u.nom}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {editId === u.id ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.actif}
                        onChange={e => setEditForm({ ...editForm, actif: e.target.checked })}
                      />
                      <span className="text-sm">Actif</span>
                    </label>
                  ) : (
                    <span className={`text-sm ${u.actif === 1 ? 'text-green-600' : 'text-red-600'}`}>
                      {u.actif === 1 ? 'Actif' : 'Inactif'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {u.cree_le ? new Date(u.cree_le).toLocaleDateString('fr-FR') : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  {editId === u.id ? (
                    <div className="space-y-1">
                      <input
                        type="password"
                        placeholder="Nouveau PIN (optionnel)"
                        value={editForm.pin}
                        onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) setEditForm({ ...editForm, pin: e.target.value }); }}
                        className="px-2 py-1 border rounded text-sm w-32"
                        maxLength={4}
                      />
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => handleModifier(u.id)}
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="px-2 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => ouvrirEdition(u)}
                        className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs hover:bg-yellow-200"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleSupprimer(u.id, u.nom)}
                        className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {utilisateurs.length === 0 && (
          <p className="text-center text-gray-400 py-8">Aucun utilisateur</p>
        )}
      </div>
    </div>
  );
};

export default GestionUtilisateurs;

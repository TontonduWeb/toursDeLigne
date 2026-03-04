import React, { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { PlanningTemplate } from '../types';

const API_URL = process.env.REACT_APP_API_URL || '';

interface VendeurActif {
  id: number;
  nom: string;
}

interface FormTemplate {
  nom: string;
  vendeurs: number[]; // utilisateur_ids dans l'ordre de sélection
}

const GestionPlanning: React.FC = () => {
  const { getAuthHeaders } = useAuthContext();
  const [templates, setTemplates] = useState<PlanningTemplate[]>([]);
  const [vendeursActifs, setVendeursActifs] = useState<VendeurActif[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [showAjout, setShowAjout] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormTemplate>({ nom: '', vendeurs: [] });
  const [editForm, setEditForm] = useState<FormTemplate>({ nom: '', vendeurs: [] });

  const chargerTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/planning/templates`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Erreur chargement templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setErreur('Impossible de charger les templates');
    }
  }, [getAuthHeaders]);

  const chargerVendeursActifs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/utilisateurs/vendeurs-actifs`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Erreur chargement vendeurs');
      const data = await res.json();
      setVendeursActifs(data.vendeurs || []);
    } catch {
      setErreur('Impossible de charger les vendeurs');
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    chargerTemplates();
    chargerVendeursActifs();
  }, [chargerTemplates, chargerVendeursActifs]);

  const toggleVendeur = (id: number, formState: FormTemplate, setFormState: (f: FormTemplate) => void) => {
    const index = formState.vendeurs.indexOf(id);
    if (index >= 0) {
      setFormState({ ...formState, vendeurs: formState.vendeurs.filter(v => v !== id) });
    } else {
      setFormState({ ...formState, vendeurs: [...formState.vendeurs, id] });
    }
  };

  const handleCreer = async () => {
    setErreur(null);

    if (!form.nom.trim()) {
      setErreur('Le nom du template est requis');
      return;
    }
    if (form.vendeurs.length === 0) {
      setErreur('Sélectionnez au moins un vendeur');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/planning/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          nom: form.nom.trim(),
          vendeurs: form.vendeurs.map((id, index) => ({
            utilisateur_id: id,
            ordre: index + 1,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur création');
      }

      setForm({ nom: '', vendeurs: [] });
      setShowAjout(false);
      chargerTemplates();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleModifier = async (id: number) => {
    setErreur(null);

    if (!editForm.nom.trim()) {
      setErreur('Le nom du template est requis');
      return;
    }
    if (editForm.vendeurs.length === 0) {
      setErreur('Sélectionnez au moins un vendeur');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/planning/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          nom: editForm.nom.trim(),
          vendeurs: editForm.vendeurs.map((uid, index) => ({
            utilisateur_id: uid,
            ordre: index + 1,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur modification');
      }

      setEditId(null);
      chargerTemplates();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleSupprimer = async (id: number, nom: string) => {
    if (!window.confirm(`Supprimer le template "${nom}" ?`)) return;

    setErreur(null);
    try {
      const res = await fetch(`${API_URL}/api/planning/templates/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur suppression');
      }

      chargerTemplates();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const ouvrirEdition = (t: PlanningTemplate) => {
    setEditId(t.id);
    setEditForm({
      nom: t.nom,
      vendeurs: t.vendeurs.map(v => v.utilisateur_id),
    });
    setErreur(null);
  };

  const getNomVendeur = (id: number): string => {
    return vendeursActifs.find(v => v.id === id)?.nom || `#${id}`;
  };

  const renderVendeurCheckboxes = (
    selectedVendeurs: number[],
    formState: FormTemplate,
    setFormState: (f: FormTemplate) => void
  ) => (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {vendeursActifs.map(v => (
          <label
            key={v.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ${
              selectedVendeurs.includes(v.id)
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedVendeurs.includes(v.id)}
              onChange={() => toggleVendeur(v.id, formState, setFormState)}
              className="sr-only"
            />
            <span>{v.nom}</span>
            {selectedVendeurs.includes(v.id) && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-medium">
                {selectedVendeurs.indexOf(v.id) + 1}
              </span>
            )}
          </label>
        ))}
      </div>
      {selectedVendeurs.length > 0 && (
        <p className="text-xs text-gray-500">
          Ordre : {selectedVendeurs.map(id => getNomVendeur(id)).join(' → ')}
        </p>
      )}
      {vendeursActifs.length === 0 && (
        <p className="text-sm text-gray-400">Aucun vendeur actif disponible</p>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Templates de planning</h2>
        <button
          onClick={() => { setShowAjout(true); setErreur(null); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          + Nouveau template
        </button>
      </div>

      {erreur && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {erreur}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showAjout && (
        <div className="mb-4 p-4 bg-white rounded-lg border-2 border-blue-200">
          <h3 className="font-medium mb-3">Nouveau template</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nom du template (ex: Lundi matin)"
              value={form.nom}
              onChange={e => setForm({ ...form, nom: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              maxLength={100}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendeurs (cliquez pour sélectionner, l'ordre de clic définit l'ordre)
              </label>
              {renderVendeurCheckboxes(form.vendeurs, form, setForm)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreer}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                Créer
              </button>
              <button
                onClick={() => { setShowAjout(false); setForm({ nom: '', vendeurs: [] }); }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table des templates */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nom</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Vendeurs</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {templates.map(t => (
              <tr key={t.id}>
                <td className="px-4 py-3 font-medium">
                  {editId === t.id ? (
                    <input
                      type="text"
                      value={editForm.nom}
                      onChange={e => setEditForm({ ...editForm, nom: e.target.value })}
                      className="px-2 py-1 border rounded w-full"
                      maxLength={100}
                    />
                  ) : t.nom}
                </td>
                <td className="px-4 py-3">
                  {editId === t.id ? (
                    renderVendeurCheckboxes(editForm.vendeurs, editForm, setEditForm)
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {t.vendeurs.map((v, i) => (
                        <span
                          key={v.utilisateur_id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs"
                        >
                          <span className="font-medium">{i + 1}.</span> {v.nom}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editId === t.id ? (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => handleModifier(t.id)}
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
                  ) : (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => ouvrirEdition(t)}
                        className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs hover:bg-yellow-200"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleSupprimer(t.id, t.nom)}
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

        {templates.length === 0 && (
          <p className="text-center text-gray-400 py-8">Aucun template de planning</p>
        )}
      </div>
    </div>
  );
};

export default GestionPlanning;

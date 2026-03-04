import React, { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { PlanningJournee, PlanningTemplate } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.27:8082';

interface VendeurActif {
  id: number;
  nom: string;
}

interface FormJournee {
  date_journee: string;
  mode: 'template' | 'manuel';
  template_id: number | null;
  vendeurs: number[];
}

// ==================== Helpers semaine ====================

function getLundi(d: Date): Date {
  const copie = new Date(d);
  const jour = copie.getDay();
  copie.setDate(copie.getDate() - (jour === 0 ? 6 : jour - 1));
  copie.setHours(0, 0, 0, 0);
  return copie;
}

function getJoursSemaine(lundi: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function getDimanche(lundi: Date): Date {
  const d = new Date(lundi);
  d.setDate(lundi.getDate() + 6);
  return d;
}

const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function formatDateAvecJour(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const d = new Date(dateStr + 'T00:00:00');
  const jourIndex = d.getDay();
  const jourNom = JOURS_SEMAINE[jourIndex === 0 ? 6 : jourIndex - 1];
  return `${jourNom} ${day}/${month}/${year}`;
}

function formatDateCourte(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function getAujourdhuiStr(): string {
  return new Date().toISOString().split('T')[0];
}

// ==================== Composant ====================

const GestionJournees: React.FC = () => {
  const { getAuthHeaders } = useAuthContext();
  const [journees, setJournees] = useState<PlanningJournee[]>([]);
  const [templates, setTemplates] = useState<PlanningTemplate[]>([]);
  const [vendeursActifs, setVendeursActifs] = useState<VendeurActif[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [showAjout, setShowAjout] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editVendeurs, setEditVendeurs] = useState<number[]>([]);
  const [form, setForm] = useState<FormJournee>({
    date_journee: '',
    mode: 'template',
    template_id: null,
    vendeurs: [],
  });

  // Vue semaine
  const [semaineCourante, setSemaineCourante] = useState<Date>(() => getLundi(new Date()));

  // Duplication
  const [duplicateSource, setDuplicateSource] = useState<PlanningJournee | null>(null);
  const [duplicateDate, setDuplicateDate] = useState<string>('');

  const aujourdhui = getAujourdhuiStr();
  const joursSemaine = getJoursSemaine(semaineCourante);

  const chargerJournees = useCallback(async () => {
    try {
      const lundi = semaineCourante.toISOString().split('T')[0];
      const dimanche = getDimanche(semaineCourante).toISOString().split('T')[0];
      const res = await fetch(`${API_URL}/api/planning/journees?du=${lundi}&au=${dimanche}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Erreur chargement journées');
      const data = await res.json();
      setJournees(data.journees || []);
    } catch {
      setErreur('Impossible de charger les journées');
    }
  }, [getAuthHeaders, semaineCourante]);

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
    chargerJournees();
  }, [chargerJournees]);

  useEffect(() => {
    chargerTemplates();
    chargerVendeursActifs();
  }, [chargerTemplates, chargerVendeursActifs]);

  // ==================== Navigation semaine ====================

  const semainePrecedente = () => {
    setSemaineCourante(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const semaineSuivante = () => {
    setSemaineCourante(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const allerAujourdhui = () => {
    setSemaineCourante(getLundi(new Date()));
  };

  // ==================== Handlers ====================

  const toggleVendeur = (id: number, list: number[], setList: (v: number[]) => void) => {
    const index = list.indexOf(id);
    if (index >= 0) {
      setList(list.filter(v => v !== id));
    } else {
      setList([...list, id]);
    }
  };

  const handleCreer = async (dateOverride?: string) => {
    setErreur(null);
    const dateJournee = dateOverride || form.date_journee;

    if (!dateJournee) {
      setErreur('La date est requise');
      return;
    }

    const body: any = { date_journee: dateJournee };

    if (form.mode === 'template') {
      if (!form.template_id) {
        setErreur('Sélectionnez un template');
        return;
      }
      body.template_id = form.template_id;
    } else {
      if (form.vendeurs.length === 0) {
        setErreur('Sélectionnez au moins un vendeur');
        return;
      }
      body.vendeurs = form.vendeurs.map((id, index) => ({
        utilisateur_id: id,
        ordre: index + 1,
      }));
    }

    try {
      const res = await fetch(`${API_URL}/api/planning/journees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur création');
      }

      setForm({ date_journee: '', mode: 'template', template_id: null, vendeurs: [] });
      setShowAjout(false);
      chargerJournees();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleModifier = async (id: number) => {
    setErreur(null);

    if (editVendeurs.length === 0) {
      setErreur('Sélectionnez au moins un vendeur');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/planning/journees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          vendeurs: editVendeurs.map((uid, index) => ({
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
      chargerJournees();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleSupprimer = async (id: number, date: string) => {
    if (!window.confirm(`Supprimer la journée du ${formatDateAvecJour(date)} ?`)) return;

    setErreur(null);
    try {
      const res = await fetch(`${API_URL}/api/planning/journees/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur suppression');
      }

      chargerJournees();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleTogglePresence = async (journeeId: number, utilisateurId: number, currentPresent: number) => {
    setErreur(null);
    try {
      const res = await fetch(`${API_URL}/api/planning/journees/${journeeId}/presence`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          utilisateur_id: utilisateurId,
          present: currentPresent === 1 ? false : true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur toggle présence');
      }

      chargerJournees();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handlePresenceMasse = async (journeeId: number, present: boolean) => {
    setErreur(null);
    try {
      const res = await fetch(`${API_URL}/api/planning/journees/${journeeId}/presence-masse`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ present }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur présence en masse');
      }

      chargerJournees();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDupliquer = async () => {
    if (!duplicateSource || !duplicateDate) return;
    setErreur(null);

    try {
      const res = await fetch(`${API_URL}/api/planning/journees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          date_journee: duplicateDate,
          vendeurs: duplicateSource.vendeurs.map((v, i) => ({
            utilisateur_id: v.utilisateur_id,
            ordre: v.ordre,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur duplication');
      }

      setDuplicateSource(null);
      setDuplicateDate('');
      chargerJournees();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const ouvrirEdition = (j: PlanningJournee) => {
    setEditId(j.id);
    setEditVendeurs(j.vendeurs.map(v => v.utilisateur_id));
    setErreur(null);
  };

  const ouvrirCreationRapide = (date: string) => {
    setForm({ ...form, date_journee: date });
    setShowAjout(true);
    setErreur(null);
  };

  // ==================== Badges de statut ====================

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'planifie':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            <span>📅</span> Planifié
          </span>
        );
      case 'en_cours':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            En cours
          </span>
        );
      case 'termine':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
            <span>✓</span> Terminé
          </span>
        );
      default:
        return null;
    }
  };

  const getNomVendeur = (id: number): string => {
    return vendeursActifs.find(v => v.id === id)?.nom || `#${id}`;
  };

  // ==================== Rendu vendeur checkboxes ====================

  const renderVendeurCheckboxes = (selectedVendeurs: number[], setSelected: (v: number[]) => void) => (
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
              onChange={() => toggleVendeur(v.id, selectedVendeurs, setSelected)}
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
    </div>
  );

  // ==================== Rendu ligne journée / jour vide ====================

  const renderJourneeLigne = (j: PlanningJournee) => (
    <tr key={j.id} className={j.date_journee === aujourdhui ? 'bg-yellow-50' : ''}>
      <td className="px-4 py-3 font-medium whitespace-nowrap">
        <div className="flex items-center gap-2">
          {formatDateAvecJour(j.date_journee)}
          {j.date_journee === aujourdhui && (
            <span className="px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-800 text-[10px] font-bold uppercase">
              Aujourd'hui
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">{getStatutBadge(j.statut)}</td>
      <td className="px-4 py-3">
        {editId === j.id ? (
          renderVendeurCheckboxes(editVendeurs, setEditVendeurs)
        ) : (
          <div>
            {j.statut === 'planifie' && (
              <div className="flex gap-1 mb-1">
                <button
                  onClick={() => handlePresenceMasse(j.id, true)}
                  className="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] hover:bg-green-100"
                  title="Tous présents"
                >
                  ✓ Tous
                </button>
                <button
                  onClick={() => handlePresenceMasse(j.id, false)}
                  className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] hover:bg-red-100"
                  title="Tous absents"
                >
                  ✗ Aucun
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {j.vendeurs.map((v) => (
                <button
                  key={v.utilisateur_id}
                  onClick={() => j.statut === 'planifie' ? handleTogglePresence(j.id, v.utilisateur_id, v.present) : undefined}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                    v.present
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-500 line-through'
                  } ${j.statut === 'planifie' ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                  title={j.statut === 'planifie' ? `Cliquez pour ${v.present ? 'marquer absent' : 'marquer présent'}` : ''}
                >
                  <span className="font-medium">{v.ordre}.</span> {v.nom}
                </button>
              ))}
            </div>
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex gap-1 justify-end flex-wrap">
          {j.statut === 'planifie' && editId === j.id && (
            <>
              <button
                onClick={() => handleModifier(j.id)}
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
            </>
          )}
          {j.statut === 'planifie' && editId !== j.id && (
            <>
              <button
                onClick={() => ouvrirEdition(j)}
                className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs hover:bg-yellow-200"
              >
                Modifier
              </button>
              <button
                onClick={() => handleSupprimer(j.id, j.date_journee)}
                className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200"
              >
                Supprimer
              </button>
            </>
          )}
          {/* Dupliquer : disponible pour tous les statuts */}
          {duplicateSource?.id === j.id ? (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={duplicateDate}
                onChange={e => setDuplicateDate(e.target.value)}
                className="px-1.5 py-0.5 border rounded text-xs w-32"
              />
              <button
                onClick={handleDupliquer}
                disabled={!duplicateDate}
                className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
              >
                OK
              </button>
              <button
                onClick={() => { setDuplicateSource(null); setDuplicateDate(''); }}
                className="px-2 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300"
              >
                ✗
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setDuplicateSource(j); setDuplicateDate(''); }}
              className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs hover:bg-purple-200"
            >
              Dupliquer
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  const renderJourVide = (dateStr: string) => (
    <tr key={`vide-${dateStr}`} className={`${dateStr === aujourdhui ? 'bg-yellow-50' : 'bg-gray-50/50'}`}>
      <td className="px-4 py-3 font-medium text-gray-400 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {formatDateAvecJour(dateStr)}
          {dateStr === aujourdhui && (
            <span className="px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-800 text-[10px] font-bold uppercase">
              Aujourd'hui
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-300 text-xs">—</td>
      <td className="px-4 py-3 text-gray-300 text-xs italic">Aucune journée planifiée</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => ouvrirCreationRapide(dateStr)}
          className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100"
        >
          + Créer
        </button>
      </td>
    </tr>
  );

  // ==================== Rendu principal ====================

  const lundiStr = formatDateCourte(semaineCourante);
  const dimancheStr = formatDateCourte(getDimanche(semaineCourante));

  // Map journées par date pour la grille semaine
  const journeesParDate = new Map<string, PlanningJournee>();
  journees.forEach(j => journeesParDate.set(j.date_journee, j));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Planning des journées</h2>
        <button
          onClick={() => { setShowAjout(true); setErreur(null); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          + Nouvelle journée
        </button>
      </div>

      {/* Navigation semaine */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-lg border px-4 py-2">
        <button
          onClick={semainePrecedente}
          className="px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          ← Précédente
        </button>
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">
            Sem. du {lundiStr} au {dimancheStr}
          </span>
          <button
            onClick={allerAujourdhui}
            className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium hover:bg-yellow-200"
          >
            Aujourd'hui
          </button>
        </div>
        <button
          onClick={semaineSuivante}
          className="px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          Suivante →
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
          <h3 className="font-medium mb-3">Nouvelle journée</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date_journee}
                onChange={e => setForm({ ...form, date_journee: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode de création</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.mode === 'template'}
                    onChange={() => setForm({ ...form, mode: 'template' })}
                  />
                  <span className="text-sm">Depuis un template</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.mode === 'manuel'}
                    onChange={() => setForm({ ...form, mode: 'manuel' })}
                  />
                  <span className="text-sm">Sélection manuelle</span>
                </label>
              </div>
            </div>

            {form.mode === 'template' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select
                  value={form.template_id || ''}
                  onChange={e => setForm({ ...form, template_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-- Choisir un template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nom} ({t.vendeurs.length} vendeur{t.vendeurs.length > 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
                {form.template_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    Vendeurs : {templates.find(t => t.id === form.template_id)?.vendeurs.map(v => v.nom).join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendeurs (cliquez pour sélectionner)
                </label>
                {renderVendeurCheckboxes(
                  form.vendeurs,
                  (v) => setForm({ ...form, vendeurs: v })
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleCreer()}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                Créer
              </button>
              <button
                onClick={() => {
                  setShowAjout(false);
                  setForm({ date_journee: '', mode: 'template', template_id: null, vendeurs: [] });
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grille semaine */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Vendeurs</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {joursSemaine.map(dateStr => {
              const journee = journeesParDate.get(dateStr);
              return journee ? renderJourneeLigne(journee) : renderJourVide(dateStr);
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GestionJournees;

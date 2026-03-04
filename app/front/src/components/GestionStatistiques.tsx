import React, { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { ArchiveJournee, ArchiveJourneeDetail, StatsAgregees } from '../types';

const API_URL = process.env.REACT_APP_API_URL || '';

type Periode = 'semaine' | 'mois';

// ==================== Helpers date ====================

function getLundi(d: Date): Date {
  const copie = new Date(d);
  const jour = copie.getDay();
  copie.setDate(copie.getDate() - (jour === 0 ? 6 : jour - 1));
  copie.setHours(0, 0, 0, 0);
  return copie;
}

function getDimanche(lundi: Date): Date {
  const d = new Date(lundi);
  d.setDate(lundi.getDate() + 6);
  return d;
}

function getDebutMois(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getFinMois(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDateCourte(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function formatDateFr(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// ==================== Composant ====================

const GestionStatistiques: React.FC = () => {
  const { getAuthHeaders } = useAuthContext();
  const [periode, setPeriode] = useState<Periode>('semaine');
  const [dateRef, setDateRef] = useState<Date>(new Date());
  const [stats, setStats] = useState<StatsAgregees | null>(null);
  const [archives, setArchives] = useState<ArchiveJournee[]>([]);
  const [detailOuvert, setDetailOuvert] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<ArchiveJourneeDetail | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Calculer la plage de dates selon la période
  const getPlage = useCallback((): { du: string; au: string } => {
    if (periode === 'semaine') {
      const lundi = getLundi(dateRef);
      const dimanche = getDimanche(lundi);
      return { du: formatDate(lundi), au: formatDate(dimanche) };
    } else {
      const debut = getDebutMois(dateRef);
      const fin = getFinMois(dateRef);
      return { du: formatDate(debut), au: formatDate(fin) };
    }
  }, [periode, dateRef]);

  const chargerDonnees = useCallback(async () => {
    const { du, au } = getPlage();
    setErreur(null);

    try {
      const [statsRes, archivesRes] = await Promise.all([
        fetch(`${API_URL}/api/archives/stats?du=${du}&au=${au}`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/archives/journees?du=${du}&au=${au}`, { headers: getAuthHeaders() }),
      ]);

      if (!statsRes.ok || !archivesRes.ok) throw new Error('Erreur chargement');

      const statsData = await statsRes.json();
      const archivesData = await archivesRes.json();

      setStats(statsData);
      setArchives(archivesData.archives || []);
    } catch {
      setErreur('Impossible de charger les statistiques');
    }
  }, [getAuthHeaders, getPlage]);

  useEffect(() => {
    chargerDonnees();
    setDetailOuvert(null);
    setDetailData(null);
  }, [chargerDonnees]);

  // Navigation
  const precedent = () => {
    setDateRef(prev => {
      const d = new Date(prev);
      if (periode === 'semaine') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setMonth(d.getMonth() - 1);
      }
      return d;
    });
  };

  const suivant = () => {
    setDateRef(prev => {
      const d = new Date(prev);
      if (periode === 'semaine') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    });
  };

  const allerAujourdhui = () => setDateRef(new Date());

  // Détail d'une archive
  const chargerDetail = async (id: number) => {
    if (detailOuvert === id) {
      setDetailOuvert(null);
      setDetailData(null);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/archives/journees/${id}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setDetailData(data.archive);
      setDetailOuvert(id);
    } catch {
      setErreur('Impossible de charger le détail');
    }
  };

  // Export CSV
  const telechargerCsv = async (id: number, dateJournee: string) => {
    try {
      const res = await fetch(`${API_URL}/api/archives/journees/${id}/csv`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journee-${dateJournee}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      setErreur('Impossible de télécharger le CSV');
    }
  };

  // Label de la période affichée
  const getPeriodeLabel = (): string => {
    if (periode === 'semaine') {
      const lundi = getLundi(dateRef);
      const dimanche = getDimanche(lundi);
      return `Sem. du ${formatDateCourte(lundi)} au ${formatDateCourte(dimanche)}`;
    } else {
      return `${MOIS_NOMS[dateRef.getMonth()]} ${dateRef.getFullYear()}`;
    }
  };

  const topVendeur = stats?.classementVendeurs?.[0];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Statistiques</h2>

      {/* Toggle période */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setPeriode('semaine')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            periode === 'semaine'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Semaine
        </button>
        <button
          onClick={() => setPeriode('mois')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            periode === 'mois'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Mois
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-lg border px-4 py-2">
        <button
          onClick={precedent}
          className="px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          ← Précédente
        </button>
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">{getPeriodeLabel()}</span>
          <button
            onClick={allerAujourdhui}
            className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium hover:bg-yellow-200"
          >
            Aujourd'hui
          </button>
        </div>
        <button
          onClick={suivant}
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

      {/* Cartes résumé */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">{stats?.nbJournees ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Journées</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">{stats?.totalVentes ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Total ventes</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-purple-600">{stats?.moyenneParJour?.toFixed(1) ?? '0'}</div>
          <div className="text-xs text-gray-500 mt-1">Moyenne / jour</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-orange-600">{topVendeur?.nom ?? '—'}</div>
          <div className="text-xs text-gray-500 mt-1">
            Top vendeur {topVendeur ? `(${topVendeur.totalVentes} ventes)` : ''}
          </div>
        </div>
      </div>

      {/* Classement vendeurs */}
      {stats && stats.classementVendeurs.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h3 className="font-medium text-sm">Classement vendeurs</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Vendeur</th>
                <th className="px-4 py-2 text-right">Ventes</th>
                <th className="px-4 py-2 text-right">Journées</th>
                <th className="px-4 py-2 text-right">Moy/jour</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.classementVendeurs.map((v, i) => (
                <tr key={v.nom} className={i === 0 ? 'bg-yellow-50' : ''}>
                  <td className="px-4 py-2 text-sm font-medium">{i + 1}</td>
                  <td className="px-4 py-2 text-sm font-medium">{v.nom}</td>
                  <td className="px-4 py-2 text-sm text-right">{v.totalVentes}</td>
                  <td className="px-4 py-2 text-sm text-right">{v.nbJournees}</td>
                  <td className="px-4 py-2 text-sm text-right">
                    {v.nbJournees > 0 ? (v.totalVentes / v.nbJournees).toFixed(1) : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Liste des journées archivées */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-medium text-sm">Journées archivées</h3>
        </div>
        {archives.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            Aucune archive pour cette période
          </div>
        ) : (
          <div className="divide-y">
            {archives.map(a => (
              <div key={a.id}>
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{formatDateFr(a.date_journee)}</span>
                    <span className="text-xs text-gray-500 ml-3">
                      {a.total_vendeurs} vendeur{a.total_vendeurs > 1 ? 's' : ''} — {a.total_ventes} vente{a.total_ventes > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => chargerDetail(a.id)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        detailOuvert === a.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      {detailOuvert === a.id ? 'Fermer' : 'Détail'}
                    </button>
                    <button
                      onClick={() => telechargerCsv(a.id, a.date_journee)}
                      className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100"
                    >
                      CSV
                    </button>
                  </div>
                </div>

                {/* Détail expandable */}
                {detailOuvert === a.id && detailData && (
                  <div className="px-4 pb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-2">
                        Clôturée le {detailData.donnees.dateClôture} à {detailData.donnees.heureClôture}
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500">
                            <th className="py-1 text-left">Vendeur</th>
                            <th className="py-1 text-right">Ventes</th>
                            <th className="py-1 text-right">Abandons</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {detailData.donnees.vendeurs.map(v => (
                            <tr key={v.nom}>
                              <td className="py-1.5 font-medium">{v.nom}</td>
                              <td className="py-1.5 text-right">{v.ventes}</td>
                              <td className="py-1.5 text-right text-gray-400">{v.abandons ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionStatistiques;

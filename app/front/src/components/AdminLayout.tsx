import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

const AdminLayout: React.FC = () => {
  const { utilisateur, deconnexion } = useAuthContext();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">Administration</h1>
            <Link
              to="/"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Tour de Ligne
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{utilisateur?.nom}</span>
            <button
              onClick={deconnexion}
              className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      {/* Navigation onglets */}
      <nav className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          <Link
            to="/admin/utilisateurs"
            className="px-4 py-3 text-sm font-medium border-b-2 border-blue-500 text-blue-600"
          >
            Utilisateurs
          </Link>
          <span className="px-4 py-3 text-sm font-medium text-gray-400 cursor-not-allowed">
            Planning (bientôt)
          </span>
        </div>
      </nav>

      {/* Contenu */}
      <main className="max-w-4xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

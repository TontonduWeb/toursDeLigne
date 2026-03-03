import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import RouteProtegee from './components/RouteProtegee';
import PageConnexion from './components/PageConnexion';
import TourDeLigneApp from './components/TourDeLigneApp';
import AdminLayout from './components/AdminLayout';
import GestionUtilisateurs from './components/GestionUtilisateurs';
import GestionPlanning from './components/GestionPlanning';
import GestionJournees from './components/GestionJournees';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/connexion" element={<PageConnexion />} />
          <Route
            path="/"
            element={
              <RouteProtegee>
                <TourDeLigneApp />
              </RouteProtegee>
            }
          />
          <Route
            path="/admin"
            element={
              <RouteProtegee adminRequis>
                <AdminLayout />
              </RouteProtegee>
            }
          >
            <Route index element={<Navigate to="/admin/utilisateurs" replace />} />
            <Route path="utilisateurs" element={<GestionUtilisateurs />} />
            <Route path="planning" element={<GestionPlanning />} />
            <Route path="journees" element={<GestionJournees />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

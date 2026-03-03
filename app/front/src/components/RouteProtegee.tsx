import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

interface RouteProtegeeProps {
  children: React.ReactNode;
  adminRequis?: boolean;
}

const RouteProtegee: React.FC<RouteProtegeeProps> = ({ children, adminRequis = false }) => {
  const { estConnecte, estAdmin } = useAuthContext();

  if (!estConnecte) {
    return <Navigate to="/connexion" replace />;
  }

  if (adminRequis && !estAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RouteProtegee;

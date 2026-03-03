import React, { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Utilisateur } from '../types';

interface AuthContextType {
  token: string | null;
  utilisateur: Utilisateur | null;
  estConnecte: boolean;
  estAdmin: boolean;
  connexion: (nom: string, pin: string, baseUrl: string) => Promise<any>;
  deconnexion: () => void;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext doit être utilisé dans un AuthProvider');
  }
  return context;
}

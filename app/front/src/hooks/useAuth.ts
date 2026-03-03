import { useState, useCallback, useEffect } from 'react';
import { Utilisateur } from '../types';

const TOKEN_KEY = 'tour-de-ligne-token';

function decodeToken(token: string): { id: number; nom: string; role: 'admin' | 'vendeur'; exp: number } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored && !isTokenExpired(stored)) {
      return stored;
    }
    if (stored) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return null;
  });

  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored && !isTokenExpired(stored)) {
      const decoded = decodeToken(stored);
      if (decoded) {
        return { id: decoded.id, nom: decoded.nom, role: decoded.role };
      }
    }
    return null;
  });

  const estConnecte = token !== null;
  const estAdmin = utilisateur?.role === 'admin';

  const connexion = useCallback(async (nom: string, pin: string, baseUrl: string) => {
    const response = await fetch(`${baseUrl}/api/connexion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, pin }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Erreur de connexion');
    }

    const data = await response.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUtilisateur(data.utilisateur);
    return data;
  }, []);

  const deconnexion = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUtilisateur(null);
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  // Vérifier l'expiration du token périodiquement
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      if (isTokenExpired(token)) {
        deconnexion();
      }
    }, 60000); // Vérifier toutes les minutes

    return () => clearInterval(interval);
  }, [token, deconnexion]);

  return {
    token,
    utilisateur,
    estConnecte,
    estAdmin,
    connexion,
    deconnexion,
    getAuthHeaders,
  };
}

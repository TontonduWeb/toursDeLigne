// src/types.ts
export interface VendeurData {
  nom: string;
  compteurVentes: number;
  compteurAbandons: number;
  clientEnCours?: {
    id: string;
    heureDebut: string;
    dateDebut: string;
  };
  en_pause: boolean;
  heure_pause: string | null;
}

export interface ServerVendeur {
  nom: string;
  ventes: number;
  clientEnCours: {
    id: string;
    heureDebut: string;
    dateDebut: string;
  } | null;
  en_pause: boolean;
  heure_pause: string | null;
}

export interface ServerState {
  ordreActuel: {
    prochainVendeur: string | null;
  };
  vendeurs: ServerVendeur[];
  historique: {
    date: string;
    heure: string;
    action: string;
    vendeur?: string;
    clientId?: string;
  }[];
}

export interface ClientEnCours {
  id: string;
  heureDebut: string;
  dateDebut: string;
}

export interface HistoriqueItem {
  action: 'vente' | 'demarrage' | 'fin' | 'prise_client' | 'abandon_client' | 'autre';
  vendeur?: string;
  clientId?: string; // Nouveau: identifiant du client
  date: string;
  heure: string;
  message?: string;
  nouvelOrdre?: string;
}

// Types auth
export interface Utilisateur {
  id: number;
  nom: string;
  role: 'admin' | 'vendeur';
  actif?: number;
  cree_le?: string;
}

export interface AuthState {
  token: string | null;
  utilisateur: Utilisateur | null;
  estConnecte: boolean;
  estAdmin: boolean;
}

export interface ConnexionPayload {
  nom: string;
  pin: string;
}

export interface ConnexionResponse {
  success: boolean;
  token: string;
  utilisateur: Utilisateur;
}

// Types planning
export interface TemplateVendeur {
  utilisateur_id: number;
  nom: string;
  ordre: number;
}

export interface PlanningTemplate {
  id: number;
  nom: string;
  vendeurs: TemplateVendeur[];
  cree_le: string;
}

// Types planning journées
export interface JourneeVendeur {
  utilisateur_id: number;
  nom: string;
  ordre: number;
  present: number;
}

export interface PlanningJournee {
  id: number;
  date_journee: string;
  template_id: number | null;
  statut: 'planifie' | 'en_cours' | 'termine';
  vendeurs: JourneeVendeur[];
  cree_le: string;
}

// Types archives
export interface ArchiveJournee {
  id: number;
  date_journee: string;
  total_vendeurs: number;
  total_ventes: number;
  moyenne_ventes: number;
  cree_le: string;
}

export interface ArchiveJourneeDetail extends ArchiveJournee {
  donnees: {
    dateClôture: string;
    heureClôture: string;
    timestamp: string;
    statistiques: {
      totalVendeurs: number;
      totalVentes: number;
      moyenneVentes: string;
    };
    vendeurs: Array<{
      nom: string;
      ventes: number;
      abandons?: number;
      clientEnCours: { id: string; heureDebut: string; dateDebut: string } | null;
    }>;
    historique: Array<{
      date: string;
      heure: string;
      action: string;
      vendeur?: string;
      clientId?: string;
    }>;
  };
}

export interface StatsAgregees {
  nbJournees: number;
  totalVentes: number;
  moyenneParJour: number;
  classementVendeurs: Array<{ nom: string; totalVentes: number; nbJournees: number }>;
}
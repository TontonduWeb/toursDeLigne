// src/types.ts
export interface VendeurData {
  nom: string;
  compteurVentes: number;
  clientEnCours?: {
    id: string;
    heureDebut: string;
    dateDebut: string;
  };
}

export interface ServerVendeur {
  nom: string;
  ventes: number;
  clientEnCours: {
    id: string;
    heureDebut: string;
    dateDebut: string;
  } | null;
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
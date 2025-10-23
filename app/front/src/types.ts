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
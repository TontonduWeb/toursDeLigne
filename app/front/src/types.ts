// src/types.ts
export interface VendeurData {
  nom: string;
  compteurVentes: number;
  clientEnCours?: ClientEnCours; // Nouveau: client actuellement pris en charge
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
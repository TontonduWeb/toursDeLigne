export interface HistoriqueItem {
  action: 'demarrage' | 'vente' | 'fin';
  date: string;
  heure: string;
  vendeur?: string;
  message?: string;
  nouvelOrdre?: string;
}

export interface VendeurData {
  nom: string;
  compteurVentes: number;
}
// src/services/vendeurService.ts
import { VendeurData } from '../types';

// Obtenir le nombre minimum de ventes parmi tous les vendeurs
export function getNombreMinimumVentes(vendeursData: Record<string, VendeurData>): number {
  if (Object.keys(vendeursData).length === 0) return 0;
  
  return Math.min(...Object.values(vendeursData).map(v => v.compteurVentes));
}

// Obtenir le nombre minimum de ventes parmi les vendeurs DISPONIBLES uniquement
export function getNombreMinimumVentesDisponibles(vendeursData: Record<string, VendeurData>): number {
  const vendeursDisponibles = Object.values(vendeursData).filter(v => !v.clientEnCours);
  
  if (vendeursDisponibles.length === 0) return 0;
  
  return Math.min(...vendeursDisponibles.map(v => v.compteurVentes));
}

// Vérifier si un vendeur est disponible (sans client en cours)
export function estVendeurDisponible(vendeur: string, vendeursData: Record<string, VendeurData>): boolean {
  const vendeurData = vendeursData[vendeur];
  return vendeurData ? !vendeurData.clientEnCours : false;
}

// Obtenir la liste des vendeurs disponibles
export function getVendeursDisponibles(
  ordreActuel: string[], 
  vendeursData: Record<string, VendeurData>
): string[] {
  return ordreActuel.filter(vendeur => estVendeurDisponible(vendeur, vendeursData));
}

// Obtenir la liste des vendeurs occupés
export function getVendeursOccupes(
  ordreActuel: string[], 
  vendeursData: Record<string, VendeurData>
): string[] {
  return ordreActuel.filter(vendeur => !estVendeurDisponible(vendeur, vendeursData));
}

// Trier l'ordre des vendeurs selon les nouvelles règles métier avec gestion des clients
export function trierOrdreVendeurs(
  ordreInitial: string[], 
  ordreActuel: string[], 
  vendeursData: Record<string, VendeurData>
): string[] {
  if (ordreActuel.length === 0) return [];
  
  // Séparer les vendeurs disponibles et occupés
  const vendeursDisponibles = getVendeursDisponibles(ordreActuel, vendeursData);
  const vendeursOccupes = getVendeursOccupes(ordreActuel, vendeursData);
  
  // Si aucun vendeur n'est disponible, retourner l'ordre actuel
  if (vendeursDisponibles.length === 0) {
    return ordreActuel;
  }
  
  // Obtenir le nombre minimum de ventes parmi les vendeurs DISPONIBLES
  const minVentesDisponibles = getNombreMinimumVentesDisponibles(vendeursData);
  
  // Séparer les vendeurs disponibles en deux groupes :
  // 1. Ceux avec le nombre minimum de ventes (prioritaires)
  // 2. Les autres (non prioritaires)
  const vendeursDisponiblesMinVentes: string[] = [];
  const autresVendeursDisponibles: string[] = [];
  
  // Parcourir l'ordre initial pour préserver l'ordre original pour les vendeurs à égalité
  for (const vendeur of ordreInitial) {
    if (vendeursDisponibles.includes(vendeur)) {
      if (vendeursData[vendeur]?.compteurVentes === minVentesDisponibles) {
        vendeursDisponiblesMinVentes.push(vendeur);
      } else {
        autresVendeursDisponibles.push(vendeur);
      }
    }
  }
  
  // Construire le nouvel ordre :
  // 1. Vendeurs disponibles avec minimum de ventes (selon ordre initial)
  // 2. Autres vendeurs disponibles (selon ordre initial)
  // 3. Vendeurs occupés (selon ordre actuel pour préserver leur position)
  const nouvelOrdre = [
    ...vendeursDisponiblesMinVentes,
    ...autresVendeursDisponibles,
    ...vendeursOccupes
  ];
  
  return nouvelOrdre;
}

// Obtenir le prochain vendeur disponible (premier de la liste des disponibles)
export function getProchainVendeurDisponible(
  ordreActuel: string[], 
  vendeursData: Record<string, VendeurData>
): string | null {
  const vendeursDisponibles = getVendeursDisponibles(ordreActuel, vendeursData);
  return vendeursDisponibles.length > 0 ? vendeursDisponibles[0] : null;
}

// Calculer les statistiques des vendeurs
export function calculerStatistiquesVendeurs(vendeursData: Record<string, VendeurData>) {
  const vendeurs = Object.values(vendeursData);
  const totalVendeurs = vendeurs.length;
  const vendeursOccupes = vendeurs.filter(v => v.clientEnCours).length;
  const vendeursDisponibles = totalVendeurs - vendeursOccupes;
  const totalVentes = vendeurs.reduce((sum, v) => sum + v.compteurVentes, 0);
  const moyenneVentes = totalVendeurs > 0 ? (totalVentes / totalVendeurs).toFixed(1) : '0';
  
  return {
    totalVendeurs,
    vendeursOccupes,
    vendeursDisponibles,
    totalVentes,
    moyenneVentes: parseFloat(moyenneVentes)
  };
}

// Vérifier si l'ordre doit être recalculé
export function doitRecalculerOrdre(
  ordreActuel: string[], 
  vendeursData: Record<string, VendeurData>
): boolean {
  // Recalculer si :
  // 1. Il y a des vendeurs disponibles
  // 2. Le premier vendeur dans l'ordre n'est pas disponible OU n'a pas le minimum de ventes
  
  const vendeursDisponibles = getVendeursDisponibles(ordreActuel, vendeursData);
  
  if (vendeursDisponibles.length === 0) {
    return false; // Pas besoin de recalculer si personne n'est disponible
  }
  
  const premierVendeur = ordreActuel[0];
  const premierVendeurDisponible = estVendeurDisponible(premierVendeur, vendeursData);
  
  if (!premierVendeurDisponible) {
    return true; // Le premier vendeur n'est pas disponible
  }
  
  const minVentesDisponibles = getNombreMinimumVentesDisponibles(vendeursData);
  const ventesPremiereVendeur = vendeursData[premierVendeur]?.compteurVentes || 0;
  
  return ventesPremiereVendeur > minVentesDisponibles; // Le premier vendeur n'a pas le minimum de ventes
}
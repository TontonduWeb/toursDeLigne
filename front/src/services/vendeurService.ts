// src/services/vendeurService.ts
import { VendeurData } from '../types';

// Obtenir le nombre minimum de ventes parmi tous les vendeurs
export function getNombreMinimumVentes(vendeursData: Record<string, VendeurData>): number {
  if (Object.keys(vendeursData).length === 0) return 0;
  
  return Math.min(...Object.values(vendeursData).map(v => v.compteurVentes));
}

// Trier l'ordre des vendeurs selon les nouvelles règles métier
export function trierOrdreVendeurs(
  ordreInitial: string[], 
  ordreActuel: string[], 
  vendeursData: Record<string, VendeurData>
): string[] {
  if (ordreActuel.length === 0) return [];
  
  // Obtenir le nombre minimum de ventes
  const minVentes = getNombreMinimumVentes(vendeursData);
  
  // Séparer les vendeurs en deux groupes : 
  // 1. Ceux avec le nombre minimum de ventes (prioritaires)
  // 2. Les autres (non prioritaires)
  const vendeursMinVentes: string[] = [];
  const autresVendeurs: string[] = [];
  
  // Parcourir l'ordre initial pour préserver l'ordre original pour les vendeurs à égalité
  for (const vendeur of ordreInitial) {
    if (ordreActuel.includes(vendeur)) {
      if (vendeursData[vendeur]?.compteurVentes === minVentes) {
        vendeursMinVentes.push(vendeur);
      } else {
        autresVendeurs.push(vendeur);
      }
    }
  }
  
  // Si tous les vendeurs ont le même nombre de ventes, on retourne l'ordre initial
  if (vendeursMinVentes.length === ordreActuel.length) {
    return ordreInitial.filter(v => ordreActuel.includes(v));
  }
  
  // Sinon, on place d'abord les vendeurs avec le minimum de ventes, en respectant l'ordre initial,
  // puis les autres vendeurs dans l'ordre actuel
  return [...vendeursMinVentes, ...autresVendeurs];
}
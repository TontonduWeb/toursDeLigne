# Checklist de Test Manuel

## Démarrage
- [ ] Ajouter 1 vendeur → démarrer
- [ ] Ajouter 3 vendeurs → réorganiser → démarrer
- [ ] Tenter de démarrer sans vendeur → erreur

## Gestion Clients
- [ ] Prendre client → vérifier statut "occupé"
- [ ] Prendre client → abandonner → vérifier statut "disponible"
- [ ] Prendre client → abandonner → cliquer à nouveau → erreur appropriée
- [ ] Tous occupés → message "Tous les vendeurs sont occupés"

## Ventes
- [ ] Prendre client → enregistrer vente → compteur incrémenté
- [ ] Enregistrer vente sans client → erreur
- [ ] Vérifier ordre après vente (vendeur va en fin)

## Ajout en cours
- [ ] Ajouter vendeur pendant journée → placé correctement
- [ ] Vendeur ajouté a 0 ventes

## Clôture
- [ ] Terminer journée → export téléchargé
- [ ] Après clôture → tout réinitialisé
- [ ] Historique sauvegardé dans export

## Synchronisation
- [ ] Ouvrir 2 onglets → action dans 1 → visible dans l'autre (polling)
- [ ] Couper serveur → message "hors ligne"
- [ ] Redémarrer serveur → reconnexion automatique
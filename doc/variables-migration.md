# Migration des variables CSS

Ce fichier résume les ajustements effectués pour harmoniser les variables CSS avec le thème Datta Able.

## Nettoyage

- Suppression des variables d'alias `--datta-*` dans `themes.css`.
- Ajout des variables `--pc-overlay-bg` et `--pc-border-muted`.
- Toutes les variables personnalisées respectent le préfixe `--pc-` ou `--current-`.
- Suppression des variables `--neo-*` devenues inutiles dans `colors.css`.

## Actions réalisées

- Remplacement des couleurs en dur dans les composants par les variables Datta (`--current-*`).
- Utilisation des classes utilitaires (`text-muted`, `bg-primary`, ...).
- Harmonisation des noms de variables dans l'ensemble des feuilles de styles.
- Mise à jour de `StatCard.jsx` et `IndividuFiche.jsx` pour n'utiliser que les variables Datta.

Ce document servira de référence pour toute nouvelle variable à introduire.

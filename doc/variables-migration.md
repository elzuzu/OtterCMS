# Migration des variables CSS

Ce fichier résume les ajustements effectués pour harmoniser les variables CSS avec le thème Datta Able.

## Nettoyage

- Suppression des doublons présents dans `themes.css` et `colors.css`.
- Toutes les variables suivent désormais le préfixe `--pc-` ou `--current-`.

## Actions réalisées

- Les couleurs codées en dur dans les composants ont été remplacées par les variables `--current-*` correspondantes.
- Les anciennes variables génériques (`--spacing-*`, `--border-radius-*`...) ont été alignées sur celles fournies par Datta Able.

Ce document servira de référence pour toute nouvelle variable à introduire.

# Migration Mapping

Ce document fait le lien entre les anciennes classes/styles de l'application et les composants du template Datta Able. Il sert de guide pour la migration progressive.

## Composants équivalents

| Ancien style / classe          | Composant Datta Able | Commentaire |
|-------------------------------|----------------------|-------------|
| `.btn-primary`, `.btn-secondary` | Boutons Datta Able (`.btn` etc.) | Couleurs mappées sur `--current-primary-color` |
| `.data-table`                  | Tables Datta Able    | Conserver les options de tri/filtre spécifiques |
| `.ui-card`                     | `card` Datta Able    | Peut remplacer directement la carte custom |
| `.banner*`                     | Alertes Datta Able   | Remplacer par `alert` Datta Able |
| `.wizard-*`                    | N/A (personnalisé)   | Garder ces styles dans `critical.css` |
| `.audit-timeline`              | N/A (personnalisé)   | Style spécifique à conserver |

## Variables CSS à mapper

| Variable actuelle                     | Variable Datta Able suggérée |
|--------------------------------------|------------------------------|
| `--spacing-*`                        | `--bs-spacing` ou utilitaire Datta |
| `--border-radius-*`                  | `--bs-border-radius-*`       |
| `--color-primary-*`                  | Palette primaire du thème Datta |
| `--current-background-color`         | Couleurs de fond du thème Datta |
| `--current-text-primary`             | Couleurs de texte Datta |

## Composants nécessitant des styles custom

- Wizard d'import et de masse (`.import-wizard`, `.mass-attribution-wizard`)
- Timeline d'audit (`.audit-timeline` et sous-classes)
- Tableaux avec filtres avancés (`.data-table`)

Ces éléments restent dans `critical.css` et seront adaptés au nouveau design au besoin.

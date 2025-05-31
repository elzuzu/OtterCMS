# Indi-Suivi

Application Electron et React permettant le suivi d'individus avec champs dynamiques et interface moderne.

## Sommaire

- [Nouveautés](#nouveautés)
- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation rapide](#installation-rapide)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Développement](#développement)
- [Construction et distribution](#construction-et-distribution)
- [Documentation](#documentation)
- [Licence](#licence)

## Nouveautés

Version **2.0** avec thèmes personnalisables et navigation revue.

L'interface repose desormais sur le template **Datta Able** adapte a Electron.
Les principaux ecrans utilisent des wrappers React (`DattaCard`, `DattaDataTable`...) pour harmoniser le rendu.
## Fonctionnalités

- Gestion des utilisateurs et des rôles (login Windows optionnel)
- Catégories et champs dynamiques entièrement configurables
- Import CSV/Excel avec attribution en masse
- Tableau de bord synthétique et audit complet des modifications
- Interface React moderne
- Visualisation graphique de l'historique pour certains champs numériques

## Prérequis

- Node.js 20.19.2 ou plus récent
- npm (ou un gestionnaire compatible)

## Installation rapide

```bash
npm install --include=dev   # dépendances + devDependencies
npm run install-app
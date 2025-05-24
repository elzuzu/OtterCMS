# Indi-Suivi UWP - Application de Gestion d'Individus

Application React Native Windows (UWP) moderne pour la gestion et le suivi d'individus avec interface inspirée de Xbox/Fluent Design.

## 🌟 Vue d'ensemble

Cette application est la version UWP native de *Indi-Suivi*. Elle utilise React Native 0.73 avec React Native Windows pour fournir une expérience fluide sur Windows 10/11.

## 🔧 Installation rapide

1. `npm install`
2. `npx react-native-windows-init --overwrite`
3. `npm run windows`

## Structure

Les fichiers principaux se trouvent dans `src/` :
- `components/` – composants réutilisables (Cartes, panneaux, table de données…)
- `screens/` – pages de l’application
- `services/` – accès à la base SQLite
- `store/` – gestion d’état avec Zustand
- `styles/` – thèmes et espacements

Le dossier `windows/` sera généré par `react-native-windows-init`.

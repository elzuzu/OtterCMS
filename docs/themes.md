# Architecture des thèmes

L'interface utilise le moteur de styles du template **Datta Able** combiné à Material-UI. Les couleurs et polices principales sont définies dans `src/renderer/styles/themes.css` et appliquées via la fonction React `useTheme`.

## Fonctionnement

- `useTheme` lit le thème enregistré (clair ou sombre) et applique la classe correspondante sur `<html>`.
- Les couleurs de base sont stockées dans `colors.css` et surchargées par `themes.css`.
- Les composants wrappers (`DattaCard`, `DattaDataTable`, etc.) encapsulent ceux de MUI pour conserver une apparence uniforme.

Vous pouvez ajouter d'autres thèmes en déclarant de nouvelles classes `.theme-xxx` dans `themes.css` et en adaptant `useTheme.js`.

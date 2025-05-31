# Architecture des thèmes

L'interface utilise le moteur de styles du template **Datta Able** combiné à Material-UI. Les couleurs et polices principales sont définies dans `src/renderer/styles/themes.css` et appliquées via la fonction React `useTheme`.

## Fonctionnement

- `useTheme` applique la classe du thème clair sur `<html>` et charge la couleur principale.
- Les couleurs de base sont stockées dans `colors.css` et surchargées par `themes.css`.
- Les composants wrappers (`DattaCard`, `DattaDataTable`, etc.) encapsulent ceux de MUI pour conserver une apparence uniforme.

Vous pouvez ajouter d'autres thèmes en déclarant de nouvelles classes `.theme-xxx` dans `themes.css` et en adaptant `useTheme.js`.

## Bordure de la fenêtre Electron

La page **Template** permet désormais de configurer la couleur et l'épaisseur de la bordure externe de la fenêtre sous Windows. Les valeurs choisies sont stockées dans le navigateur (localStorage) et appliquées via les variables CSS `--window-border-color` et `--window-border-width` définies dans `themes.css`.

Si aucune valeur n'est définie par l'utilisateur, la configuration par défaut est lue dans `config/app-config.json` (clé `windowBorder`).

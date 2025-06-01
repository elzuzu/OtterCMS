# Architecture des thèmes

L'interface utilise le moteur de styles du template **Datta Able** combiné à Material-UI. Les couleurs et polices principales sont définies dans `src/renderer/styles/themes.css` et appliquées via la fonction React `useTheme`.

## Fonctionnement

- `useTheme` définit désormais l'attribut `data-pc-preset` sur la balise `<html>` pour activer les préréglages de couleur Datta Able et charge la couleur principale correspondante.
- Les couleurs de base sont stockées dans `colors.css` et surchargées par `themes.css`.
- Les composants wrappers (`DattaCard`, `DattaDataTable`, etc.) encapsulent ceux de MUI pour conserver une apparence uniforme.

Vous pouvez ajouter d'autres thèmes en ajoutant de nouveaux presets dans `useTheme.js` et en étendant la liste proposée dans la rubrique Template.

## Rubrique Template

La page **Template** regroupe les préréglages issus de Datta Able pour personnaliser rapidement l'interface. Les principales couleurs Bootstrap (Primary, Secondary, Success, Danger, Warning, Info, Light et Dark) sont exposées et génèrent automatiquement les classes `.text-{color}` et `.bg-{color}`.

Sous Windows, cette rubrique permet également d'ajuster la bordure native de la fenêtre. L'appel à `DwmSetWindowAttribute` est désormais géré via **electron-edge-js**, qui exécute du code .NET pour contacter l'API DWM sans compilation additionnelle. Les paramètres choisis (couleur et épaisseur) sont mémorisés dans `localStorage` et appliqués via les variables CSS `--window-border-color` et `--window-border-width`. Si aucune préférence n'est définie, les valeurs du fichier `config/app-config.json` (clé `windowBorder`) sont utilisées.

### Changer la couleur de bordure depuis la console

La fonction `setWindowBorderColor`, placée dans le **processus principal**, s'appuie désormais sur `electron-edge-js` pour contacter l'API DWM. Elle peut être déclenchée depuis l'interface grâce à l'API IPC :

```javascript
// Console du renderer (DevTools)
window.api.applyBorderTemplate({ color: '#ff0000' });
```

Vous pouvez aussi créer une instance de `BorderTemplateService` afin de profiter des vérifications intégrées :

```javascript
const borderService = new BorderTemplateService();
borderService.applyTemplate({ color: '#00ff00' });
```

Un exemple de test est disponible dans `src/main.js` via la fonction `testBorderColors()`.
